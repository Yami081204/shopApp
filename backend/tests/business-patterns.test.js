import test from 'node:test';
import assert from 'node:assert/strict';
import { createVietQrAdapter } from '../adapters/vietQrAdapter.js';
import { createEventPublisher } from '../events/eventPublisher.js';
import { createPaymentStrategyFactory } from '../factories/paymentStrategyFactory.js';
import { createOrderService } from '../services/orderService.js';
import { createOrderQueryService } from '../services/orderQueryService.js';
import { codPaymentStrategy } from '../strategies/payment/codPaymentStrategy.js';
import { createDiscountStrategyFactory } from '../strategies/discount/discountStrategyFactory.js';
import { createThresholdShippingStrategy } from '../strategies/shipping/thresholdShippingStrategy.js';
import { assertOrderTransition, normalizeOrderStatus } from '../services/orderState.js';
import { assertPaymentTransition } from '../states/paymentState.js';
import { createOrderPricingBuilder } from '../builders/orderPricingBuilder.js';
import { createCheckoutFacade } from '../facades/checkoutFacade.js';
import { getAppContainer, resetAppContainer } from '../singletons/appContainer.js';

test('discount strategies calculate percentage and fixed vouchers without exceeding the subtotal', () => {
  const factory = createDiscountStrategyFactory();
  assert.equal(factory.forVoucher(null).calculate(1200), 0);
  assert.equal(factory.forVoucher({
    type: 'PERCENTAGE',
    value: 10,
    maximumDiscount: 90
  }).calculate(1200, { value: 10, maximumDiscount: 90 }), 90);
  assert.equal(factory.forVoucher({
    type: 'FIXED',
    value: 500,
    maximumDiscount: 200
  }).calculate(120, { value: 500, maximumDiscount: 200 }), 120);
});

test('threshold shipping strategy waives the fee at the configured threshold', () => {
  const strategy = createThresholdShippingStrategy({ freeShippingThreshold: 500, standardFee: 30 });
  assert.equal(strategy.calculate(499.99), 30);
  assert.equal(strategy.calculate(500), 0);
});

test('payment factory resolves COD and bank transfer aliases to independent strategies', () => {
  const vietQrPaymentStrategy = {
    method: 'VIETQR',
    prepare: ({ amount, reference }) => ({ method: 'VIETQR', amount, reference }),
    planReport: () => ({ action: 'report' }),
    planConfirmation: () => ({ action: 'use-existing' })
  };
  const factory = createPaymentStrategyFactory({
    strategies: [codPaymentStrategy, vietQrPaymentStrategy]
  });
  assert.equal(factory.normalizeMethod('bank_transfer'), 'VIETQR');
  assert.deepEqual(factory.availableMethods(), ['COD', 'VIETQR']);
  assert.equal(factory.forMethod('COD').prepare({ amount: 10 }).method, 'COD');
  assert.deepEqual(factory.forMethod('VIETQR').prepare({ amount: 10, reference: 'R-1' }), {
    method: 'VIETQR',
    amount: 10,
    reference: 'R-1'
  });
  assert.throws(() => factory.normalizeMethod('MOMO'), { code: 'VALIDATION_ERROR' });
});

test('payment factory hides VietQR until the bank account is configured', () => {
  const factory = createPaymentStrategyFactory({
    strategies: [codPaymentStrategy, {
      method: 'VIETQR',
      isAvailable: () => false,
      prepare: () => ({ method: 'VIETQR' }),
      planReport: () => ({ action: 'report' }),
      planConfirmation: () => ({ action: 'use-existing' })
    }]
  });

  assert.deepEqual(factory.availableMethods(), ['COD']);
});

test('VietQR adapter requires shop configuration and encodes the exact amount in the payment QR', () => {
  const unconfigured = createVietQrAdapter({ env: {} });
  assert.equal(unconfigured.isConfigured(), false);
  assert.throws(
    () => unconfigured.createPaymentInstructions({ amount: 100, reference: 'ORDER-1' }),
    { code: 'PAYMENT_CONFIGURATION_ERROR' }
  );
  const configured = createVietQrAdapter({
    env: {
      VIETQR_BANK_ID: 'TESTBANK',
      VIETQR_ACCOUNT_NUMBER: '12345678',
      VIETQR_ACCOUNT_NAME: 'SHOP TEST'
    }
  });
  assert.equal(configured.isConfigured(), true);
  const instructions = configured.createPaymentInstructions({ amount: 100, reference: 'ORDER-1' });
  assert.match(instructions.qrImageUrl, /amount=100/);
  assert.match(instructions.qrImageUrl, /addInfo=ORDER-1/);
  assert.match(instructions.verification, /updated automatically after SePay confirms/);
  const manualInstructions = configured.createPaymentInstructions({
    amount: 125000,
    reference: 'PAY-ORDER-2',
    confirmationMode: 'manual'
  });
  assert.match(manualInstructions.qrImageUrl, /amount=125000/);
  assert.match(manualInstructions.qrImageUrl, /addInfo=PAY-ORDER-2/);
  assert.match(manualInstructions.verification, /admin/i);
});

test('order and payment states reject backwards or duplicate transitions', () => {
  assert.equal(normalizeOrderStatus('shipped'), 'SHIPPING');
  assert.doesNotThrow(() => assertOrderTransition('PENDING', 'CONFIRMED'));
  assert.throws(() => assertOrderTransition('DELIVERED', 'PROCESSING'), { code: 'CONFLICT' });
  assert.doesNotThrow(() => assertPaymentTransition('PENDING', 'PAID'));
  assert.throws(() => assertPaymentTransition('PAID', 'PENDING'), { code: 'CONFLICT' });
});

test('observer failures are isolated from the event publisher', async () => {
  const errors = [];
  let successfulObserverCalled = false;
  const publisher = createEventPublisher({ logger: { error: (...args) => errors.push(args) } });
  publisher.subscribe('order.created', async () => { throw new Error('notification storage unavailable'); });
  publisher.subscribe('order.created', async () => { successfulObserverCalled = true; });

  await assert.doesNotReject(() => publisher.publish({ type: 'order.created' }));
  assert.equal(successfulObserverCalled, true);
  assert.equal(errors.length, 1);
});

test('order service uses injected repositories/strategies and emits only after commit', async () => {
  let transactionCommitted = false;
  let createdOrder;
  const events = [];
  let savedItems = [];
  let savedPayment;
  const product = { id: 8, name: 'Lipstick', image: 'image.png', price: '120', countInStock: 10, isActive: true };
  const orderRepository = {
    transaction: async (callback) => {
      const result = await callback({ transaction: true });
      transactionCommitted = true;
      return result;
    },
    findAddress: async () => null,
    findProductForUpdate: async () => product,
    decrementStock: async () => [1],
    createOrder: async (data) => {
      createdOrder = { id: 41, ...data, toJSON() { return { ...this }; } };
      return createdOrder;
    },
    createOrderItems: async (items) => { savedItems = items; },
    createPayment: async (data) => { savedPayment = data; },
    createStatusHistory: async () => ({}),
    clearPurchasedCartItems: async () => {},
    findOrder: async () => ({
      ...createdOrder,
      orderItems: savedItems,
      payment: savedPayment,
      toJSON() { return this; }
    })
  };
  const service = createOrderService({
    orderRepository,
    voucherRepository: {
      findByCodeForUpdate: async () => ({
        id: 4,
        code: 'SAVE50',
        type: 'FIXED',
        value: 50,
        maximumDiscount: null,
        minimumOrderAmount: 0,
        usageCount: 0,
        usageLimit: null,
        isActive: true
      }),
      consume: async () => true
    },
    discountStrategyFactory: createDiscountStrategyFactory(),
    shippingStrategy: createThresholdShippingStrategy(),
    paymentService: {
      normalizeMethod: () => 'COD',
      assertMethodAvailable: () => {},
      createPendingPayment: async ({ orderId, amount }) => {
        savedPayment = {
          orderId,
          paymentReference: 'PAY-TEST-ORDER',
          paymentMethod: 'COD',
          amount,
          status: 'PENDING'
        };
        return {
          payment: savedPayment,
          paymentInstructions: {
            method: 'COD',
            amount,
            reference: savedPayment.paymentReference
          }
        };
      }
    },
    eventPublisher: {
      publish: async (event) => {
        assert.equal(transactionCommitted, true);
        events.push(event);
      }
    }
  });

  const order = await service.createOrder(9, {
    firstName: 'Test',
    lastName: 'Customer',
    email: 'test@example.com',
    phone: '0900000000',
    address: 'Street 1',
    city: 'Hanoi',
    state: 'Ba Dinh',
    paymentMethod: 'COD',
    voucherCode: 'save50',
    cart: [{ productId: 8, quantity: 2, product: { price: 0 } }]
  });

  assert.equal(order.totalPrice, 30190);
  assert.equal(order.discountPrice, 50);
  assert.equal(order.paymentInstructions.method, 'COD');
  assert.equal(order.orderItems[0].price, 120);
  assert.equal(order.paymentInstructions.reference, order.payment.paymentReference);
  assert.equal(events.length, 1);
  assert.equal(events[0].type, 'order.created');
});

test('checkout rejects an unconfigured payment method before reading or changing inventory', async () => {
  let transactionStarted = false;
  let inventoryTouched = false;
  const service = createOrderService({
    orderRepository: {
      transaction: async (callback) => {
        transactionStarted = true;
        return callback({});
      },
      findProductForUpdate: async () => { inventoryTouched = true; }
    },
    voucherRepository: {},
    discountStrategyFactory: {},
    shippingStrategy: {},
    paymentService: {
      normalizeMethod: () => 'VIETQR',
      assertMethodAvailable: () => {
        throw Object.assign(new Error('VietQR is not configured'), { statusCode: 503 });
      }
    },
    eventPublisher: { publish: async () => {} }
  });

  await assert.rejects(
    () => service.createOrder(9, { paymentMethod: 'VIETQR', cart: [{ productId: 8, quantity: 1 }] }),
    /VietQR is not configured/
  );
  assert.equal(transactionStarted, true);
  assert.equal(inventoryTouched, false);
});

test('admin order statistics use database aggregates and confirmed payment dates', async () => {
  const service = createOrderQueryService({
    orderQueryRepository: {},
    orderStatsRepository: {
      findPaidPayments: async () => [
        { orderId: 1, amount: '120.00', confirmedAt: '2026-11-02T10:00:00.000Z' },
        { orderId: 2, amount: '80.00', confirmedAt: '2026-10-12T10:00:00.000Z' },
        { orderId: 3, amount: '500.00', confirmedAt: null }
      ],
      countOrders: async () => 12,
      countPendingOrders: async () => 4,
      countCustomers: async () => 9,
      countActiveProducts: async () => 18,
      findLowStockProducts: async () => [{ id: 8, name: 'Lipstick', countInStock: 2 }],
      findRecentOrders: async () => [{ id: 12, orderNumber: 'ORD-12' }],
      findTopSellingProducts: async () => [{ productId: 8, productName: 'Lipstick', quantitySold: '7' }],
      sumOrderItems: async () => '7'
    },
    voucherRepository: {},
    discountStrategyFactory: {},
    shippingStrategy: {},
    paymentService: {},
    eventPublisher: { publish: async () => {} },
    now: () => new Date('2026-11-03T10:00:00.000Z')
  });

  const stats = await service.getStats();
  assert.equal(stats.totalOrders, 12);
  assert.equal(stats.pendingOrders, 4);
  assert.equal(stats.totalCustomers, 9);
  assert.equal(stats.totalProducts, 18);
  assert.equal(stats.totalRevenue, 700);
  assert.equal(stats.totalProductsSold, 7);
  assert.equal(stats.revenueByMonth.length, 6);
  assert.equal(stats.revenueByMonth.find(({ month }) => month === '2026-11').revenue, 120);
  assert.equal(stats.revenueByMonth.find(({ month }) => month === '2026-10').revenue, 80);
  assert.equal(stats.revenueByMonth[0].month, '2026-06');
  assert.deepEqual(stats.lowStockProducts, [{ id: 8, name: 'Lipstick', countInStock: 2 }]);
});

test('order pricing builder assembles subtotal, discount, shipping and total step by step', () => {
  const pricing = createOrderPricingBuilder()
    .addLine(120, 2)
    .addLine(50, 1)
    .applyDiscount(50)
    .applyShipping((discountedSubtotal) => (discountedSubtotal >= 200 ? 0 : 30))
    .build();

  assert.equal(pricing.subtotal, 290);
  assert.equal(pricing.discountPrice, 50);
  assert.equal(pricing.shippingPrice, 0);
  assert.equal(pricing.totalPrice, 240);
});

test('checkout facade hides order and payment services behind one checkout API', async () => {
  const calls = [];
  const facade = createCheckoutFacade({
    orderService: {
      createOrder: async (...args) => { calls.push(['place', args]); return { id: 1 }; },
      getStats: async () => ({ totalOrders: 3 })
    },
    orderQueryService: {
      findOrderForUser: async () => ({
        id: 1,
        orderStatus: 'PENDING',
        payment: {
          paymentMethod: 'VIETQR',
          paymentReference: 'PAY-1',
          status: 'PENDING'
        }
      }),
      getStats: async () => ({ totalOrders: 3 })
    },
    paymentService: {
      getAvailableMethods: () => ['COD', 'VIETQR'],
      isDemoVietQrEnabled: () => false,
      isManualVietQrEnabled: () => false,
      getPaymentInstructions: (payment) => ({
        method: payment.paymentMethod,
        reference: payment.paymentReference
      }),
      confirmPayment: async (...args) => { calls.push(['confirm', args]); return { order: { id: 1 } }; }
    }
  });

  assert.deepEqual(facade.listPaymentMethods(), {
    methods: ['COD', 'VIETQR'],
    vietQrDemoMode: false,
    vietQrManualConfirmation: false
  });
  assert.deepEqual(await facade.placeOrder(7, { paymentMethod: 'COD' }, 'key-1'), { id: 1 });
  const pendingOrder = await facade.getOrder(1, { id: 7 });
  assert.equal(pendingOrder.paymentInstructions.reference, 'PAY-1');
  assert.deepEqual(await facade.confirmPayment(1, { id: 7 }, {}), { order: { id: 1 } });
  assert.deepEqual(await facade.getStats(), { totalOrders: 3 });
  assert.equal(calls.length, 2);
});

test('app container singleton returns the same composition root', () => {
  resetAppContainer();
  const first = getAppContainer(() => ({ id: 'shop-root' }));
  const second = getAppContainer(() => ({ id: 'another-root' }));
  assert.equal(first, second);
  assert.equal(first.id, 'shop-root');
  resetAppContainer();
});
