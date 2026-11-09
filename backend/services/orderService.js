import { randomUUID } from 'crypto';
import AppError from '../utils/AppError.js';
import { parsePositiveInteger } from '../utils/parsePositiveInteger.js';
import { isUniqueConstraintError } from '../utils/persistenceErrors.js';
import { assertOrderTransition, normalizeOrderStatus } from './orderState.js';
import { createOrderPricingBuilder } from '../builders/orderPricingBuilder.js';
import { createInventoryReservationService } from './checkout/inventoryReservationService.js';
import { parseCheckoutItems, parseIdempotencyKey } from './checkout/parseCheckoutItems.js';
import { createShippingAddressService } from './checkout/shippingAddressService.js';
import { createVoucherApplicationService } from './checkout/voucherApplicationService.js';

const createOrderService = ({
  orderRepository,
  voucherRepository,
  discountStrategyFactory,
  shippingStrategy,
  paymentService,
  eventPublisher,
  now = () => new Date(),
  inventoryReservationService = createInventoryReservationService({
    inventoryRepository: orderRepository
  }),
  shippingAddressService = createShippingAddressService({
    addressRepository: orderRepository
  }),
  voucherApplicationService = createVoucherApplicationService({
    voucherRepository,
    discountStrategyFactory,
    now
  })
}) => {
  const publishOrderEvent = async (type, order, additionalData = {}) => {
    await eventPublisher.publish({
      type,
      orderId: order.id,
      orderNumber: order.orderNumber,
      userId: order.userId,
      ...additionalData
    });
  };

  const createOrder = async (userId, body = {}, suppliedIdempotencyKey) => {
    const idempotencyKey = parseIdempotencyKey(suppliedIdempotencyKey);

    const loadExistingOrder = async (transaction) => {
      if (!idempotencyKey || !orderRepository.findOrderByIdempotencyKey) return null;
      const existing = await orderRepository.findOrderByIdempotencyKey(idempotencyKey, userId, transaction);
      if (!existing) return null;
      return {
        order: existing,
        payment: existing.payment,
        paymentInstructions: existing.payment ? paymentService.getPaymentInstructions(existing.payment) : undefined,
        replayed: true
      };
    };

    let order;
    try {
      order = await orderRepository.transaction(async (transaction) => {
      const existingOrder = await loadExistingOrder(transaction);
      if (existingOrder) return existingOrder;

      const paymentMethod = paymentService.normalizeMethod(body.paymentMethod);
      paymentService.assertMethodAvailable(paymentMethod);
      const shipping = await shippingAddressService.resolve(userId, body, transaction);
      const quantities = parseCheckoutItems(body);
      const orderLines = await inventoryReservationService.reserve(quantities, transaction);
      const pricingBuilder = createOrderPricingBuilder();
      for (const { price, quantity } of orderLines) pricingBuilder.addLine(price, quantity);

      const { voucher, discount } = await voucherApplicationService.apply(
        body.voucherCode,
        pricingBuilder.build().subtotal,
        transaction
      );
      const { discountPrice: appliedDiscount, shippingPrice, totalPrice } = pricingBuilder
        .applyDiscount(discount)
        .applyShipping((discountedSubtotal) => shippingStrategy.calculate(discountedSubtotal))
        .build();
      const orderNumber = `ORD-${randomUUID()}`;

      const order = await orderRepository.createOrder({
        orderNumber,
        idempotencyKey,
        userId,
        totalPrice,
        shippingPrice,
        discountPrice: appliedDiscount,
        voucherCode: voucher?.code || null,
        shippingAddress: `${shipping.recipientName}; ${shipping.phone}; ${shipping.address}`,
        paymentMethod,
        status: 'pending',
        orderStatus: 'PENDING',
        isPaid: false
      }, transaction);

      const orderItems = await inventoryReservationService.commit(order.id, orderLines, transaction);
      await orderRepository.createOrderItems(orderItems, transaction);
      const { payment, paymentInstructions } = await paymentService.createPendingPayment({
        orderId: order.id,
        paymentMethod,
        amount: totalPrice,
        transaction
      });
      await orderRepository.createStatusHistory({
        orderId: order.id,
        fromStatus: null,
        toStatus: 'PENDING',
        changedBy: userId,
        note: 'Order created'
      }, transaction);

      await voucherApplicationService.consume(voucher, transaction);
      await orderRepository.clearPurchasedCartItems(userId, orderLines.map((line) => ({
        productId: line.product.id,
        variantId: line.variant?.id ?? null
      })), transaction);
      const savedOrder = await orderRepository.findOrder(order.id, {}, transaction);
      return { order: savedOrder, payment, paymentInstructions, replayed: false };
      });
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;
      if (!idempotencyKey) throw error;
      const existingOrder = await loadExistingOrder();
      if (!existingOrder) throw new AppError('Order request key has already been used', 409, 'CONFLICT');
      order = existingOrder;
    }

    if (!order.replayed) await publishOrderEvent('order.created', order.order);
    return {
      ...order.order.toJSON(),
      payment: order.payment,
      paymentInstructions: order.paymentInstructions
    };
  };

  const cancelOrder = async (orderId, user) => {
    const order = await orderRepository.transaction(async (transaction) => {
      const where = user.isAdmin ? {} : { userId: user.id };
      const current = await orderRepository.findOrderForUpdate(
        parsePositiveInteger(orderId, 'id'),
        where,
        transaction,
        true
      );
      if (!current) throw new AppError('Order not found', 404, 'NOT_FOUND');
      if (!user.isAdmin && current.orderStatus !== 'PENDING') {
        throw new AppError('Only pending orders can be cancelled by the customer', 409, 'CONFLICT');
      }
      const previousStatus = current.orderStatus;
      assertOrderTransition(previousStatus, 'CANCELLED');
      await paymentService.cancelPayment(current.id, transaction);
      await inventoryReservationService.restore(current.orderItems, transaction);
      await orderRepository.updateOrder(current, {
        orderStatus: 'CANCELLED',
        status: 'cancelled'
      }, transaction);
      await orderRepository.createStatusHistory({
        orderId: current.id,
        fromStatus: previousStatus,
        toStatus: 'CANCELLED',
        changedBy: user.id,
        note: 'Order cancelled'
      }, transaction);
      return current;
    });

    await publishOrderEvent('order.status.changed', order, { status: 'CANCELLED' });
    return order;
  };

  const updateOrderStatus = async (orderId, nextStatus, actorId, note) => {
    const result = await orderRepository.transaction(async (transaction) => {
      const order = await orderRepository.findOrderForUpdate(
        parsePositiveInteger(orderId, 'id'),
        {},
        transaction
      );
      if (!order) throw new AppError('Order not found', 404, 'NOT_FOUND');
      const target = normalizeOrderStatus(nextStatus);
      if (target === 'CANCELLED') {
        throw new AppError('Use the cancellation workflow to cancel an order', 409, 'CONFLICT');
      }
      const previousStatus = order.orderStatus;
      assertOrderTransition(previousStatus, target);
      const legacyStatus = {
        PENDING: 'pending',
        CONFIRMED: 'processing',
        PROCESSING: 'processing',
        SHIPPING: 'shipped',
        DELIVERED: 'delivered'
      }[target];
      await orderRepository.updateOrder(order, {
        orderStatus: target,
        status: legacyStatus,
        isDelivered: target === 'DELIVERED',
        deliveredAt: target === 'DELIVERED' ? now() : order.deliveredAt
      }, transaction);
      await orderRepository.createStatusHistory({
        orderId: order.id,
        fromStatus: previousStatus,
        toStatus: target,
        changedBy: actorId,
        note: typeof note === 'string' ? note.slice(0, 500) : null
      }, transaction);
      return { order, status: target };
    });

    await publishOrderEvent('order.status.changed', result.order, { status: result.status });
    return result.order;
  };

  return {
    createOrder,
    cancelOrder,
    updateOrderStatus
  };
};

export { createOrderService };
