import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoucherService } from '../services/voucherService.js';

const makeService = () => {
  const vouchers = [];
  const voucherRepository = {
    create: async (data) => {
      const voucher = { id: vouchers.length + 1, ...data };
      vouchers.push(voucher);
      return voucher;
    },
    findById: async (id) => vouchers.find((voucher) => voucher.id === id) || null,
    update: async (voucher, data) => Object.assign(voucher, data),
    list: async () => vouchers
  };
  return { vouchers, service: createVoucherService({ voucherRepository }) };
};

test('creating a voucher accepts empty optional limits and dates', async () => {
  const { service } = makeService();

  const voucher = await service.create({
    code: 'kk',
    type: 'PERCENTAGE',
    value: 10,
    minimumOrderAmount: 0,
    maximumDiscount: null,
    usageLimit: null,
    startsAt: null,
    expiresAt: null,
    isActive: true
  });

  assert.equal(voucher.code, 'KK');
  assert.equal(voucher.maximumDiscount, null);
  assert.equal(voucher.usageLimit, null);
  assert.equal(voucher.startsAt, null);
  assert.equal(voucher.expiresAt, null);
});

test('updating a voucher can clear optional limits and dates', async () => {
  const { service } = makeService();
  const created = await service.create({
    code: 'save20',
    type: 'PERCENTAGE',
    value: 20,
    minimumOrderAmount: 100,
    maximumDiscount: 50,
    usageLimit: 10,
    startsAt: '2026-11-01T00:00:00.000Z',
    expiresAt: '2026-12-01T00:00:00.000Z',
    isActive: true
  });

  const updated = await service.update(created.id, {
    maximumDiscount: null,
    usageLimit: null,
    startsAt: null,
    expiresAt: null
  });

  assert.equal(updated.maximumDiscount, null);
  assert.equal(updated.usageLimit, null);
  assert.equal(updated.startsAt, null);
  assert.equal(updated.expiresAt, null);
  assert.equal(updated.value, 20);
});
