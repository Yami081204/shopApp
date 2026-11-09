import { randomUUID } from 'crypto';
import AppError from '../utils/AppError.js';
import { parsePositiveInteger } from '../utils/parsePositiveInteger.js';
import { isUniqueConstraintError } from '../utils/persistenceErrors.js';
import { assertPaymentTransition } from '../states/paymentState.js';

const createPaymentService = ({
  paymentRepository,
  paymentStrategyFactory,
  eventPublisher,
  paymentReferenceFactory = () => `PAY-${randomUUID()}`,
  vietQrAccountNumber,
  sepayWebhookApiKey,
  vietQrMode = 'live',
  now = () => new Date()
}) => {
  const validateTransactionReference = (value) => {
    if (typeof value !== 'string' || !value.trim() || value.trim().length > 191) {
      throw new AppError('A transaction reference of 1 to 191 characters is required', 400, 'VALIDATION_ERROR');
    }
    return value.trim();
  };

  const validateAmount = (value, expectedAmount) => {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount <= 0 || amount !== Number(expectedAmount)) {
      throw new AppError('Reported amount must exactly match the payment amount', 409, 'CONFLICT');
    }
    return amount;
  };

  const normalizeMethod = (method) => paymentStrategyFactory.normalizeMethod(method);

  const isAutomaticVietQrEnabled = () => Boolean(
    vietQrMode === 'live' &&
    String(vietQrAccountNumber ?? '').trim()
    && String(sepayWebhookApiKey ?? '').trim()
  );

  const isDemoVietQrEnabled = () => vietQrMode === 'demo';
  const isManualVietQrEnabled = () => vietQrMode === 'manual';

  const getAvailabilityContext = () => ({
    isAutomaticConfirmationEnabled: isAutomaticVietQrEnabled(),
    isDemoMode: isDemoVietQrEnabled(),
    isManualConfirmation: isManualVietQrEnabled()
  });

  const getAvailableMethods = () => paymentStrategyFactory.availableMethods(getAvailabilityContext());

  const assertMethodAvailable = (method) => {
    const strategy = paymentStrategyFactory.forMethod(method);
    const context = getAvailabilityContext();
    if (strategy.isAvailable && !strategy.isAvailable(context)) {
      throw new AppError(
        strategy.unavailableMessage?.(context) || 'Payment method is unavailable',
        503,
        'PAYMENT_CONFIGURATION_ERROR'
      );
    }
    return strategy;
  };

  const createPendingPayment = async ({ orderId, paymentMethod, amount, transaction }) => {
    const method = normalizeMethod(paymentMethod);
    const rawPaymentReference = paymentReferenceFactory();
    const paymentReference = isDemoVietQrEnabled() && method === 'VIETQR'
      ? `DEMO-${rawPaymentReference}`
      : rawPaymentReference;
    const paymentInstructions = assertMethodAvailable(method).prepare({
      amount,
      reference: paymentReference
    });
    const payment = await paymentRepository.createPayment({
      orderId,
      paymentReference,
      amount,
      paymentMethod: method,
      status: 'PENDING'
    }, transaction);
    return { payment, paymentInstructions };
  };

  const getPaymentInstructions = (payment) => assertMethodAvailable(payment.paymentMethod).prepare({
    amount: payment.amount,
    reference: payment.paymentReference
  });

  const cancelPayment = async (orderId, transaction) => {
    const payment = await paymentRepository.findPaymentForUpdate(orderId, transaction);
    if (!payment) throw new AppError('Payment record not found', 409, 'CONFLICT');
    if (payment.status === 'PAID') {
      throw new AppError('Paid orders cannot be cancelled without a refund process', 409, 'CONFLICT');
    }
    assertPaymentTransition(payment.status, 'CANCELLED');
    await paymentRepository.updatePayment(payment, { status: 'CANCELLED' }, transaction);
    return payment;
  };

  const findOrderAndPayment = async (orderId, user, transaction) => {
    if (!user?.id) throw new AppError('Authentication required', 401, 'UNAUTHENTICATED');
    const order = await paymentRepository.findOrderForUpdate(
      parsePositiveInteger(orderId, 'id'),
      transaction
    );
    if (!order || (!user.isAdmin && Number(order.userId) !== Number(user.id))) {
      throw new AppError('Order not found', 404, 'NOT_FOUND');
    }
    const payment = await paymentRepository.findPaymentForUpdate(order.id, transaction);
    if (!payment) throw new AppError('Payment record not found', 409, 'CONFLICT');
    return { order, payment };
  };

  const reportTransfer = async (orderId, user, input = {}) => {
    const transactionReference = validateTransactionReference(input.transactionReference);
    try {
      const result = await paymentRepository.transaction(async (transaction) => {
        const { order, payment } = await findOrderAndPayment(orderId, user, transaction);
        if (Number(order.userId) !== Number(user.id)) {
          throw new AppError('Order not found', 404, 'NOT_FOUND');
        }
        paymentStrategyFactory.forMethod(payment.paymentMethod).planReport({ payment, order, user });
        const amount = validateAmount(input.amount, payment.amount);
        const paymentTransaction = await paymentRepository.createTransaction({
          paymentId: payment.id,
          orderId: order.id,
          transactionReference,
          amount,
          paymentMethod: payment.paymentMethod,
          status: 'PENDING',
          reportedBy: user.id,
          reportedAt: now()
        }, transaction);
        return { order, paymentTransaction };
      });

      await eventPublisher.publish({
        type: 'payment.reported',
        orderId: result.order.id,
        orderNumber: result.order.orderNumber,
        userId: result.order.userId
      });
      return result;
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new AppError('This transaction reference has already been used', 409, 'CONFLICT');
      }
      throw error;
    }
  };

  const processSepayWebhook = async (input = {}) => {
    if (isDemoVietQrEnabled()) return { status: 'ignored', reason: 'demo_mode' };
    if (isManualVietQrEnabled()) return { status: 'ignored', reason: 'manual_confirmation_mode' };
    const transactionId = String(input.id ?? '').trim();
    if (!transactionId || transactionId.length > 150) {
      return { status: 'ignored', reason: 'invalid_transaction_id' };
    }
    if (String(input.transferType ?? '').trim().toLowerCase() !== 'in') {
      return { status: 'ignored', reason: 'not_incoming' };
    }

    const expectedAccountNumber = String(vietQrAccountNumber ?? '').replace(/\s/g, '');
    const receivedAccountNumber = String(input.accountNumber ?? '').replace(/\s/g, '');
    if (!expectedAccountNumber || receivedAccountNumber !== expectedAccountNumber) {
      return { status: 'ignored', reason: 'account_mismatch' };
    }

    const paymentReference = `${input.content ?? ''} ${input.description ?? ''}`
      .match(/\bPAY-[A-Z0-9]+(?:-[A-Z0-9]+)*\b/i)?.[0];
    if (!paymentReference) {
      return { status: 'ignored', reason: 'payment_reference_missing' };
    }

    const amount = Number(input.transferAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return { status: 'ignored', reason: 'invalid_amount' };
    }

    const transactionReference = `SEPAY-${transactionId}`;
    let result;
    try {
      result = await paymentRepository.transaction(async (transaction) => {
        const duplicate = await paymentRepository.findTransactionByReference(
          transactionReference,
          transaction
        );
        if (duplicate) return { status: 'duplicate' };

        const candidatePayment = await paymentRepository.findPaymentByReference(
          paymentReference,
          transaction
        );
        if (!candidatePayment) return { status: 'ignored', reason: 'payment_not_found' };

        const order = await paymentRepository.findOrderForUpdate(candidatePayment.orderId, transaction);
        const payment = order
          ? await paymentRepository.findPaymentForUpdate(order.id, transaction)
          : null;
        if (!order || !payment || payment.paymentReference !== candidatePayment.paymentReference) {
          return { status: 'ignored', reason: 'payment_not_found' };
        }
        const strategy = paymentStrategyFactory.forMethod(payment.paymentMethod);
        if (!strategy.acceptsIncomingTransfer) {
          return { status: 'ignored', reason: 'unsupported_payment_method' };
        }
        strategy.planReport({ payment, order });
        if (amount !== Number(payment.amount)) {
          return { status: 'ignored', reason: 'amount_mismatch' };
        }

        const confirmedAt = now();
        const paymentTransaction = await paymentRepository.createTransaction({
          paymentId: payment.id,
          orderId: order.id,
          transactionReference,
          amount,
          paymentMethod: payment.paymentMethod,
          status: 'CONFIRMED',
          confirmedAt,
          confirmedBy: null,
          reportedAt: null,
          reportedBy: null
        }, transaction);
        await paymentRepository.updatePayment(payment, {
          status: 'PAID',
          confirmedAt,
          confirmedBy: null
        }, transaction);
        await paymentRepository.updateOrder(order, {
          isPaid: true,
          paidAt: confirmedAt
        }, transaction);

        return { status: 'confirmed', order, paymentTransaction };
      });
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;
      const duplicate = await paymentRepository.findTransactionByReference(transactionReference);
      if (duplicate) return { status: 'duplicate' };
      throw error;
    }

    if (result.status === 'confirmed') {
      await eventPublisher.publish({
        type: 'payment.confirmed',
        orderId: result.order.id,
        orderNumber: result.order.orderNumber,
        userId: result.order.userId
      });
    }
    return result;
  };

  const confirmPayment = async (orderId, actor, input = {}) => {
    if (!actor?.isAdmin) {
      throw new AppError('Administrator access required', 403, 'FORBIDDEN');
    }
    const transactionReference = validateTransactionReference(input.transactionReference);

    try {
      const result = await paymentRepository.transaction(async (transaction) => {
        const { order, payment } = await findOrderAndPayment(orderId, actor, transaction);
        if (order.orderStatus === 'CANCELLED') {
          throw new AppError('Payment cannot be confirmed for a cancelled order', 409, 'CONFLICT');
        }
        assertPaymentTransition(payment.status, 'PAID');
        const amount = validateAmount(input.amount, payment.amount);
        let paymentTransaction = await paymentRepository.findTransactionForUpdate({
          paymentId: payment.id,
          orderId: order.id,
          transactionReference
        }, transaction);
        const strategy = paymentStrategyFactory.forMethod(payment.paymentMethod);
        const manualVietQrConfirmation = isManualVietQrEnabled()
          && payment.paymentMethod === 'VIETQR'
          && !paymentTransaction;
        const confirmation = manualVietQrConfirmation
          ? { action: 'create' }
          : strategy.planConfirmation({
            payment,
            order,
            existingTransaction: paymentTransaction,
            amount,
            actor
          });
        if (confirmation.action === 'create') {
          paymentTransaction = await paymentRepository.createTransaction({
            paymentId: payment.id,
            orderId: order.id,
            transactionReference,
            amount,
            paymentMethod: payment.paymentMethod,
            status: 'PENDING',
            reportedBy: manualVietQrConfirmation ? null : actor.id,
            reportedAt: manualVietQrConfirmation ? null : now()
          }, transaction);
        } else if (confirmation.action !== 'use-existing') {
          throw new Error(`Unsupported payment confirmation action: ${confirmation.action}`);
        }

        const confirmedAt = now();
        await paymentRepository.updateTransaction(paymentTransaction, {
          status: 'CONFIRMED',
          amount,
          confirmedAt,
          confirmedBy: actor.id
        }, transaction);
        await paymentRepository.updatePayment(payment, {
          status: 'PAID',
          confirmedAt,
          confirmedBy: actor.id
        }, transaction);
        await paymentRepository.updateOrder(order, { isPaid: true, paidAt: confirmedAt }, transaction);
        return { order, payment, paymentTransaction };
      });

      await eventPublisher.publish({
        type: 'payment.confirmed',
        orderId: result.order.id,
        orderNumber: result.order.orderNumber,
        userId: result.order.userId
      });
      return result;
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new AppError('This transaction reference has already been used', 409, 'CONFLICT');
      }
      throw error;
    }
  };

  const simulateDemoPayment = async (orderId, user) => {
    if (!isDemoVietQrEnabled()) {
      throw new AppError('VietQR demo payments are disabled', 404, 'NOT_FOUND');
    }
    if (!user?.id || user.isAdmin) {
      throw new AppError('Customer access required', 403, 'FORBIDDEN');
    }

    const result = await paymentRepository.transaction(async (transaction) => {
      const { order, payment } = await findOrderAndPayment(orderId, user, transaction);
      if (Number(order.userId) !== Number(user.id)) {
        throw new AppError('Order not found', 404, 'NOT_FOUND');
      }
      if (payment.paymentMethod !== 'VIETQR') {
        throw new AppError('Demo payment is only available for VietQR orders', 409, 'CONFLICT');
      }
      if (!String(payment.paymentReference).startsWith('DEMO-')) {
        throw new AppError('This VietQR order was not created in demo mode', 409, 'CONFLICT');
      }

      const transactionReference = `DEMO-${payment.paymentReference.slice('DEMO-'.length)}`;
      const existingTransaction = await paymentRepository.findTransactionForUpdate({
        paymentId: payment.id,
        orderId: order.id,
        transactionReference
      }, transaction);
      if (payment.status === 'PAID' && existingTransaction?.status === 'CONFIRMED') {
        return { order, paymentTransaction: existingTransaction, alreadyPaid: true };
      }
      if (order.orderStatus === 'CANCELLED') {
        throw new AppError('Cancelled orders cannot be paid', 409, 'CONFLICT');
      }
      assertPaymentTransition(payment.status, 'PAID');
      if (existingTransaction) {
        throw new AppError('A demo payment transaction already exists in an invalid state', 409, 'CONFLICT');
      }

      const confirmedAt = now();
      const paymentTransaction = await paymentRepository.createTransaction({
        paymentId: payment.id,
        orderId: order.id,
        transactionReference,
        amount: Number(payment.amount),
        paymentMethod: 'VIETQR',
        status: 'CONFIRMED',
        confirmedAt,
        confirmedBy: null,
        reportedBy: user.id,
        reportedAt: confirmedAt
      }, transaction);
      await paymentRepository.updatePayment(payment, {
        status: 'PAID',
        confirmedAt,
        confirmedBy: null
      }, transaction);
      await paymentRepository.updateOrder(order, {
        isPaid: true,
        paidAt: confirmedAt
      }, transaction);
      return { order, paymentTransaction, alreadyPaid: false };
    });

    if (!result.alreadyPaid) {
      await eventPublisher.publish({
        type: 'payment.confirmed',
        orderId: result.order.id,
        orderNumber: result.order.orderNumber,
        userId: result.order.userId,
        demoMode: true
      });
    }
    return result;
  };

  return {
    normalizeMethod,
    isAutomaticVietQrEnabled,
    isDemoVietQrEnabled,
    isManualVietQrEnabled,
    getAvailableMethods,
    assertMethodAvailable,
    createPendingPayment,
    getPaymentInstructions,
    cancelPayment,
    reportTransfer,
    processSepayWebhook,
    confirmPayment,
    simulateDemoPayment
  };
};

export { createPaymentService };
