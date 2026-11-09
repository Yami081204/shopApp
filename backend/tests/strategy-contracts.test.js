import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertDiscountStrategy,
  assertPaymentStrategy,
  assertShippingStrategy
} from '../contracts/strategyContracts.js';
import { createPaymentStrategyFactory } from '../factories/paymentStrategyFactory.js';
import { createDiscountStrategyFactory } from '../strategies/discount/discountStrategyFactory.js';
import { createThresholdShippingStrategy } from '../strategies/shipping/thresholdShippingStrategy.js';
import { createVietQrPaymentStrategy } from '../strategies/payment/vietQrPaymentStrategy.js';

test('every registered payment strategy implements the substitutable payment contract', () => {
  const paymentFactory = createPaymentStrategyFactory();
  paymentFactory.register({
    method: 'TEST',
    prepare: ({ amount, reference }) => ({ method: 'TEST', status: 'PENDING', amount, reference }),
    planReport: () => ({ action: 'report' }),
    planConfirmation: () => ({ action: 'use-existing' })
  });
  const strategy = paymentFactory.forMethod('TEST');
  assert.equal(assertPaymentStrategy(strategy), strategy);
  assert.deepEqual(strategy.prepare({ amount: 25, reference: 'PAY-25' }), {
    method: 'TEST',
    status: 'PENDING',
    amount: 25,
    reference: 'PAY-25'
  });
  assert.equal(strategy.planReport().action, 'report');
  assert.equal(strategy.planConfirmation().action, 'use-existing');

  assert.throws(() => paymentFactory.register({ method: 'BROKEN', prepare() {} }), /planReport/);
});

test('all discount strategies preserve the common calculate contract', () => {
  const discountFactory = createDiscountStrategyFactory();
  discountFactory.register({ type: 'TEST', calculate: () => 5 });
  assert.equal(discountFactory.forType('TEST').calculate(100), 5);
  for (const type of discountFactory.registeredTypes()) {
    const strategy = assertDiscountStrategy(discountFactory.forType(type));
    const result = strategy.calculate(1000, {
      type,
      value: type === 'PERCENTAGE' ? 10 : 100,
      maximumDiscount: null
    });
    assert.equal(Number.isFinite(result), true);
    assert.equal(result >= 0 && result <= 1000, true);
  }
});

test('payment and shipping strategy registrations are validated at composition boundaries', () => {
  const payment = createVietQrPaymentStrategy({
    vietQrAdapter: {
      isConfigured: () => true,
      createPaymentInstructions: ({ amount, reference }) => ({ amount, reference })
    }
  });
  assert.equal(assertPaymentStrategy(payment), payment);

  const shipping = createThresholdShippingStrategy({ freeShippingThreshold: 500, standardFee: 30 });
  assert.equal(assertShippingStrategy(shipping), shipping);
  assert.equal(shipping.calculate(499), 30);
  assert.equal(shipping.calculate(500), 0);
  assert.throws(() => assertShippingStrategy({}), /calculate/);
});
