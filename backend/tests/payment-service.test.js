import test from 'node:test';
import assert from 'node:assert/strict';
import { UniqueConstraintError } from 'sequelize';
import { createPaymentStrategyFactory } from '../factories/paymentStrategyFactory.js';
import { createPaymentService } from '../services/paymentService.js';
import { createOrderService } from '../services/orderService.js';
import { codPaymentStrategy } from '../strategies/payment/codPaymentStrategy.js';
import { createVietQrPaymentStrategy } from '../strategies/payment/vietQrPaymentStrategy.js';
import { createDiscountStrategyFactory } from '../strategies/discount/discountStrategyFactory.js';
import { createThresholdShippingStrategy } from '../strategies/shipping/thresholdShippingStrategy.js';

const makePaymentFixture = ({
  orderId = 1,
  userId = 7,
  orderStatus = 'PENDING',
  paymentMethod = 'VIETQR',
  paymentStatus = 'PENDING',
  amount = 1000,
  vietQrMode = 'live'
} = {}) => {
  const orders = new Map([[orderId, {
    id: orderId,
    userId,
    orderNumber: `ORD-${orderId}`,
    orderStatus,
    isPaid: false
  }]]);
  const payments = new Map([[orderId, {
    id: orderId + 100,
    orderId,
    paymentReference: `${vietQrMode === 'demo' ? 'DEMO-' : ''}PAY-${orderId}`,
    paymentMethod,
    amount,
    status: paymentStatus
  }]]);
  const transactions = [];
  let nextTransactionId = 1;
  const repository = {
    transaction: (callback) => callback({ LOCK: { UPDATE: 'UPDATE' } }),
    findOrderForUpdate: async (id) => orders.get(Number(id)) || null,
    findPaymentForUpdate: async (id) => payments.get(Number(id)) || null,
    findPaymentByReference: async (reference) => [...payments.values()].find((item) =>
      item.paymentReference === reference
    ) || null,
    findTransactionByReference: async (reference) => transactions.find((item) =>
      item.transactionReference === reference
    ) || null,
    findTransactionForUpdate: async (where) => transactions.find((item) =>
      item.paymentId === where.paymentId &&
      item.orderId === where.orderId &&
      item.transactionReference === where.transactionReference
    ) || null,
    createPayment: async (data) => ({ id: data.orderId + 100, ...data }),
    createTransaction: async (data) => {
      if (transactions.some((item) => item.transactionReference === data.transactionReference)) {
        throw new UniqueConstraintError({ message: 'Duplicate transaction reference' });
      }
      const item = { id: nextTransactionId++, ...data };
      transactions.push(item);
      return item;
    },
    updateTransaction: async (item, data) => Object.assign(item, data),
    updatePayment: async (payment, data) => Object.assign(payment, data),
    updateOrder: async (order, data) => Object.assign(order, data)
  };
  const events = [];
  const paymentStrategyFactory = createPaymentStrategyFactory({
    strategies: [
      codPaymentStrategy,
      createVietQrPaymentStrategy({
        mode: vietQrMode,
        vietQrAdapter: {
          isConfigured: () => true,
          createPaymentInstructions: ({ amount, reference }) => ({ method: 'VIETQR', amount, reference })
        }
      })
    ]
  });
  const service = createPaymentService({
    paymentRepository: repository,
    paymentStrategyFactory,
    eventPublisher: { publish: async (event) => events.push(event) },
    vietQrAccountNumber: '12345678',
    sepayWebhookApiKey: 'webhook-test-key',
    vietQrMode,
    now: () => new Date('2026-11-03T08:00:00.000Z')
  });
  return { service, orders, payments, transactions, events, repository, paymentStrategyFactory };
};

const customer = { id: 7, isAdmin: false };
const admin = { id: 99, isAdmin: true };

test('a customer transfer report remains pending until an administrator verifies it', async () => {
  const fixture = makePaymentFixture();

  const reported = await fixture.service.reportTransfer(1, customer, {
    transactionReference: 'BANK-REF-1',
    amount: 1000
  });
  assert.equal(reported.paymentTransaction.status, 'PENDING');
  assert.equal(fixture.payments.get(1).status, 'PENDING');
  assert.equal(fixture.orders.get(1).isPaid, false);

  const confirmed = await fixture.service.confirmPayment(1, admin, {
    transactionReference: 'BANK-REF-1',
    amount: 1000
  });
  assert.equal(confirmed.paymentTransaction.status, 'CONFIRMED');
  assert.equal(confirmed.paymentTransaction.confirmedBy, admin.id);
  assert.equal(confirmed.paymentTransaction.confirmedAt.toISOString(), '2026-11-03T08:00:00.000Z');
  assert.equal(fixture.payments.get(1).status, 'PAID');
  assert.equal(fixture.payments.get(1).confirmedBy, admin.id);
  assert.equal(fixture.orders.get(1).isPaid, true);
  assert.equal(fixture.events.at(-1).type, 'payment.confirmed');
});

test('VietQR is unavailable until automatic SePay confirmation is configured', async () => {
  const fixture = makePaymentFixture();
  const withoutWebhookKey = createPaymentService({
    paymentRepository: fixture.repository,
    paymentStrategyFactory: fixture.paymentStrategyFactory,
    eventPublisher: { publish: async () => {} },
    vietQrAccountNumber: '12345678',
    sepayWebhookApiKey: ''
  });

  assert.deepEqual(withoutWebhookKey.getAvailableMethods(), ['COD']);
  assert.equal(withoutWebhookKey.isAutomaticVietQrEnabled(), false);
  await assert.rejects(
    withoutWebhookKey.createPendingPayment({
      orderId: 1,
      paymentMethod: 'VIETQR',
      amount: 1000
    }),
    { code: 'PAYMENT_CONFIGURATION_ERROR' }
  );
  assert.deepEqual(fixture.service.getAvailableMethods(), ['COD', 'VIETQR']);
  assert.equal(fixture.service.isAutomaticVietQrEnabled(), true);
});

test('demo VietQR is available without bank credentials and never creates a real QR', async () => {
  const fixture = makePaymentFixture({ vietQrMode: 'demo' });
  const service = createPaymentService({
    paymentRepository: fixture.repository,
    paymentStrategyFactory: fixture.paymentStrategyFactory,
    eventPublisher: { publish: async () => {} },
    vietQrAccountNumber: '',
    sepayWebhookApiKey: '',
    vietQrMode: 'demo'
  });

  assert.deepEqual(service.getAvailableMethods(), ['COD', 'VIETQR']);
  const instructions = service.getPaymentInstructions(fixture.payments.get(1));
  assert.equal(instructions.demoMode, true);
  assert.equal(instructions.qrImageUrl, undefined);
  assert.match(instructions.instructions, /không.*chuyển tiền thật/i);
  assert.equal(service.isAutomaticVietQrEnabled(), false);
  assert.equal(service.isDemoVietQrEnabled(), true);
  const createdPayment = await service.createPendingPayment({
    orderId: 2,
    paymentMethod: 'VIETQR',
    amount: 1200
  });
  assert.match(createdPayment.payment.paymentReference, /^DEMO-PAY-/);
  assert.equal(createdPayment.paymentInstructions.demoMode, true);
  assert.deepEqual(await service.processSepayWebhook({
    id: 1,
    transferType: 'in',
    transferAmount: 1000,
    accountNumber: '12345678',
    content: 'PAY-1'
  }), { status: 'ignored', reason: 'demo_mode' });
  assert.equal(fixture.payments.get(1).status, 'PENDING');
});

test('demo payment confirms only its owner VietQR order and is safe to retry', async () => {
  const fixture = makePaymentFixture({ vietQrMode: 'demo' });
  const service = createPaymentService({
    paymentRepository: fixture.repository,
    paymentStrategyFactory: fixture.paymentStrategyFactory,
    eventPublisher: { publish: async (event) => fixture.events.push(event) },
    vietQrMode: 'demo',
    now: () => new Date('2026-11-03T08:00:00.000Z')
  });

  await assert.rejects(service.simulateDemoPayment(1, { id: 8, isAdmin: false }), {
    code: 'NOT_FOUND'
  });
  assert.equal(fixture.payments.get(1).status, 'PENDING');

  const confirmed = await service.simulateDemoPayment(1, customer);
  assert.equal(confirmed.paymentTransaction.transactionReference, 'DEMO-PAY-1');
  assert.equal(confirmed.paymentTransaction.status, 'CONFIRMED');
  assert.equal(confirmed.paymentTransaction.confirmedBy, null);
  assert.equal(fixture.payments.get(1).status, 'PAID');
  assert.equal(fixture.orders.get(1).isPaid, true);

  const retried = await service.simulateDemoPayment(1, customer);
  assert.equal(retried.alreadyPaid, true);
  assert.equal(fixture.transactions.length, 1);
  assert.equal(fixture.events.filter((event) => event.type === 'payment.confirmed').length, 1);
});

test('demo payment confirmation is disabled outside demo mode and for non-VietQR orders', async () => {
  const liveFixture = makePaymentFixture();
  await assert.rejects(liveFixture.service.simulateDemoPayment(1, customer), {
    code: 'NOT_FOUND'
  });

  const codFixture = makePaymentFixture({ vietQrMode: 'demo', paymentMethod: 'COD' });
  const demoService = createPaymentService({
    paymentRepository: codFixture.repository,
    paymentStrategyFactory: codFixture.paymentStrategyFactory,
    eventPublisher: { publish: async () => {} },
    vietQrMode: 'demo'
  });
  await assert.rejects(demoService.simulateDemoPayment(1, customer), {
    code: 'CONFLICT'
  });

  const liveOrderInDemoFixture = makePaymentFixture({ vietQrMode: 'demo' });
  liveOrderInDemoFixture.payments.get(1).paymentReference = 'PAY-LEGACY';
  const legacyDemoService = createPaymentService({
    paymentRepository: liveOrderInDemoFixture.repository,
    paymentStrategyFactory: liveOrderInDemoFixture.paymentStrategyFactory,
    eventPublisher: { publish: async () => {} },
    vietQrMode: 'demo'
  });
  await assert.rejects(legacyDemoService.simulateDemoPayment(1, customer), {
    code: 'CONFLICT'
  });
});

test('manual VietQR mode needs no SePay webhook and lets admins confirm verified transfers', async () => {
  const fixture = makePaymentFixture({ vietQrMode: 'manual' });
  const service = createPaymentService({
    paymentRepository: fixture.repository,
    paymentStrategyFactory: fixture.paymentStrategyFactory,
    eventPublisher: { publish: async (event) => fixture.events.push(event) },
    vietQrAccountNumber: '',
    sepayWebhookApiKey: '',
    vietQrMode: 'manual',
    now: () => new Date('2026-11-03T08:00:00.000Z')
  });

  assert.deepEqual(service.getAvailableMethods(), ['COD', 'VIETQR']);
  assert.equal(service.isAutomaticVietQrEnabled(), false);
  assert.equal(service.isManualVietQrEnabled(), true);
  assert.deepEqual(await service.processSepayWebhook({
    id: 'real-bank-transaction',
    transferType: 'in',
    transferAmount: 1000,
    accountNumber: '12345678',
    content: 'PAY-1'
  }), { status: 'ignored', reason: 'manual_confirmation_mode' });

  const result = await service.confirmPayment(1, admin, {
    transactionReference: 'BANK-STATEMENT-0001',
    amount: 1000
  });
  assert.equal(result.paymentTransaction.status, 'CONFIRMED');
  assert.equal(result.paymentTransaction.reportedBy, null);
  assert.equal(result.paymentTransaction.confirmedBy, admin.id);
  assert.equal(fixture.payments.get(1).status, 'PAID');
  assert.equal(fixture.orders.get(1).isPaid, true);
  assert.equal(fixture.events.at(-1).type, 'payment.confirmed');
});

test('a matching incoming SePay transaction automatically confirms a VietQR order', async () => {
  const fixture = makePaymentFixture();
  const result = await fixture.service.processSepayWebhook({
    id: 987,
    transferType: 'in',
    transferAmount: 1000,
    accountNumber: '12345678',
    content: 'PAY-1'
  });

  assert.equal(result.status, 'confirmed');
  assert.equal(fixture.payments.get(1).status, 'PAID');
  assert.equal(fixture.orders.get(1).isPaid, true);
  assert.equal(fixture.transactions[0].transactionReference, 'SEPAY-987');
  assert.equal(fixture.transactions[0].confirmedBy, null);
  assert.equal(fixture.events.at(-1).type, 'payment.confirmed');
});

test('SePay webhook ignores mismatched accounts, amounts, outgoing transfers, and unknown references', async () => {
  const fixture = makePaymentFixture();
  const payload = {
    id: 988,
    transferType: 'in',
    transferAmount: 1000,
    accountNumber: '12345678',
    content: 'PAY-1'
  };

  assert.equal((await fixture.service.processSepayWebhook({ ...payload, transferType: 'out' })).status, 'ignored');
  assert.equal((await fixture.service.processSepayWebhook({ ...payload, accountNumber: '87654321' })).status, 'ignored');
  assert.equal((await fixture.service.processSepayWebhook({ ...payload, transferAmount: 999 })).status, 'ignored');
  assert.equal((await fixture.service.processSepayWebhook({ ...payload, content: 'UNKNOWN' })).status, 'ignored');
  assert.equal(fixture.payments.get(1).status, 'PENDING');
  assert.equal(fixture.transactions.length, 0);
});

test('replayed SePay webhook events do not create duplicate payment transactions', async () => {
  const fixture = makePaymentFixture();
  const payload = {
    id: 989,
    transferType: 'in',
    transferAmount: 1000,
    accountNumber: '12345678',
    content: 'PAY-1'
  };

  assert.equal((await fixture.service.processSepayWebhook(payload)).status, 'confirmed');
  assert.equal((await fixture.service.processSepayWebhook(payload)).status, 'duplicate');
  assert.equal(fixture.transactions.length, 1);
  assert.equal(fixture.events.filter((event) => event.type === 'payment.confirmed').length, 1);
});

test('same-value orders and identical products cannot share a transfer report', async () => {
  const fixture = makePaymentFixture();
  fixture.orders.set(2, {
    id: 2, userId: 7, orderNumber: 'ORD-2', orderStatus: 'PENDING', isPaid: false
  });
  fixture.payments.set(2, {
    id: 102, orderId: 2, paymentReference: 'PAY-2',
    paymentMethod: 'VIETQR', amount: 1000, status: 'PENDING'
  });

  await fixture.service.reportTransfer(1, customer, {
    transactionReference: 'SAME-BANK-REF',
    amount: 1000
  });
  await assert.rejects(
    fixture.service.confirmPayment(2, admin, {
      transactionReference: 'SAME-BANK-REF',
      amount: 1000
    }),
    { code: 'CONFLICT' }
  );
  await assert.rejects(
    fixture.service.reportTransfer(2, customer, {
      transactionReference: 'SAME-BANK-REF',
      amount: 1000
    }),
    { code: 'CONFLICT' }
  );
  assert.equal(fixture.orders.get(1).isPaid, false);
  assert.equal(fixture.orders.get(2).isPaid, false);
});

test('admin cannot confirm a VietQR payment when the reported transaction does not exist', async () => {
  const fixture = makePaymentFixture();
  await assert.rejects(
    fixture.service.confirmPayment(1, admin, {
      transactionReference: 'NOT-REPORTED',
      amount: 1000
    }),
    { code: 'CONFLICT' }
  );
  assert.equal(fixture.payments.get(1).status, 'PENDING');
  assert.equal(fixture.orders.get(1).isPaid, false);
});

test('incorrect amounts are rejected when reporting and when confirming', async () => {
  const fixture = makePaymentFixture();
  await assert.rejects(
    fixture.service.reportTransfer(1, customer, {
      transactionReference: 'BANK-REF-WRONG-AMOUNT',
      amount: 999
    }),
    { code: 'CONFLICT' }
  );
  await fixture.service.reportTransfer(1, customer, {
    transactionReference: 'BANK-REF-CORRECT',
    amount: 1000
  });
  await assert.rejects(
    fixture.service.confirmPayment(1, admin, {
      transactionReference: 'BANK-REF-CORRECT',
      amount: 999
    }),
    { code: 'CONFLICT' }
  );
  assert.equal(fixture.payments.get(1).status, 'PENDING');
});

test('non-admin users cannot confirm payments and customers cannot report transfers for another user', async () => {
  const fixture = makePaymentFixture();
  fixture.orders.set(2, {
    id: 2, userId: 8, orderNumber: 'ORD-2', orderStatus: 'PENDING', isPaid: false
  });
  fixture.payments.set(2, {
    id: 102, orderId: 2, paymentReference: 'PAY-2',
    paymentMethod: 'VIETQR', amount: 1000, status: 'PENDING'
  });
  await assert.rejects(
    fixture.service.confirmPayment(2, customer, {
      transactionReference: 'BANK-REF',
      amount: 1000
    }),
    { code: 'FORBIDDEN' }
  );
  await assert.rejects(
    fixture.service.reportTransfer(1, { id: 8, isAdmin: false }, {
      transactionReference: 'BANK-REF',
      amount: 1000
    }),
    { code: 'NOT_FOUND' }
  );
});

test('a bank transaction reference cannot be confirmed twice or reused by another order', async () => {
  const fixture = makePaymentFixture();
  fixture.orders.set(2, {
    id: 2, userId: 7, orderNumber: 'ORD-2', orderStatus: 'PENDING', isPaid: false
  });
  fixture.payments.set(2, {
    id: 102, orderId: 2, paymentReference: 'PAY-2',
    paymentMethod: 'VIETQR', amount: 1000, status: 'PENDING'
  });
  await fixture.service.reportTransfer(1, customer, {
    transactionReference: 'BANK-REF-ONCE',
    amount: 1000
  });
  await fixture.service.confirmPayment(1, admin, {
    transactionReference: 'BANK-REF-ONCE',
    amount: 1000
  });
  await assert.rejects(
    fixture.service.confirmPayment(1, admin, {
      transactionReference: 'BANK-REF-ONCE',
      amount: 1000
    }),
    { code: 'CONFLICT' }
  );
  await assert.rejects(
    fixture.service.reportTransfer(2, customer, {
      transactionReference: 'BANK-REF-ONCE',
      amount: 1000
    }),
    { code: 'CONFLICT' }
  );
  assert.equal(fixture.orders.get(2).isPaid, false);
});

test('COD remains pending before delivery and is recorded only after delivery', async () => {
  const fixture = makePaymentFixture({ paymentMethod: 'COD' });
  await assert.rejects(
    fixture.service.confirmPayment(1, admin, {
      transactionReference: 'COD-RECEIPT-1',
      amount: 1000
    }),
    { code: 'CONFLICT' }
  );
  assert.equal(fixture.payments.get(1).status, 'PENDING');
  assert.equal(fixture.orders.get(1).isPaid, false);

  fixture.orders.get(1).orderStatus = 'DELIVERED';
  const result = await fixture.service.confirmPayment(1, admin, {
    transactionReference: 'COD-RECEIPT-1',
    amount: 1000
  });
  assert.equal(result.paymentTransaction.status, 'CONFIRMED');
  assert.equal(result.paymentTransaction.paymentMethod, 'COD');
  assert.equal(fixture.payments.get(1).status, 'PAID');
  assert.equal(fixture.orders.get(1).isPaid, true);
});

test('reordering a previously paid product creates a separate pending payment and reference', async () => {
  let nextId = 1;
  const createdPayments = [];
  let lastOrder;
  let lastItems = [];
  let lastPayment;
  const repository = {
    transaction: async (callback) => callback({}),
    findAddress: async () => null,
    findProductForUpdate: async () => ({
      id: 8, name: 'Lipstick', image: 'image.png', price: 100, countInStock: 10, isActive: true
    }),
    decrementStock: async () => [1],
    createOrder: async (data) => {
      lastOrder = { id: nextId++, ...data };
      return lastOrder;
    },
    createOrderItems: async (items) => { lastItems = items; },
    createStatusHistory: async () => ({}),
    clearPurchasedCartItems: async () => {},
    findOrder: async () => ({
      ...lastOrder,
      orderItems: lastItems,
      payment: lastPayment,
      toJSON() { return this; }
    })
  };
  let referenceNumber = 0;
  const paymentService = createPaymentService({
    paymentRepository: {
      createPayment: async (data) => {
        lastPayment = { id: nextId + 100, ...data };
        createdPayments.push(lastPayment);
        return lastPayment;
      }
    },
    paymentStrategyFactory: {
      normalizeMethod: (method) => method,
      forMethod: (method) => ({
        prepare: ({ amount, reference }) => ({ method, amount, reference })
      })
    },
    paymentReferenceFactory: () => `PAY-REORDER-${++referenceNumber}`,
    vietQrAccountNumber: '12345678',
    sepayWebhookApiKey: 'webhook-test-key',
    eventPublisher: { publish: async () => {} }
  });
  const service = createOrderService({
    orderRepository: repository,
    voucherRepository: { findByCodeForUpdate: async () => null },
    discountStrategyFactory: createDiscountStrategyFactory(),
    shippingStrategy: createThresholdShippingStrategy({ freeShippingThreshold: 500, standardFee: 30 }),
    paymentService,
    eventPublisher: { publish: async () => {} }
  });
  const input = {
    firstName: 'Test',
    lastName: 'Customer',
    email: 'test@example.com',
    phone: '0900000000',
    address: 'Street 1',
    city: 'Hanoi',
    state: 'Ba Dinh',
    paymentMethod: 'VIETQR',
    items: [{ productId: 8, quantity: 1 }]
  };

  const firstOrder = await service.createOrder(7, input);
  createdPayments[0].status = 'PAID';
  const reordered = await service.createOrder(7, input);

  assert.equal(firstOrder.totalPrice, reordered.totalPrice);
  assert.notEqual(firstOrder.payment.paymentReference, reordered.payment.paymentReference);
  assert.equal(reordered.payment.status, 'PENDING');
  assert.equal(reordered.isPaid, false);
});
