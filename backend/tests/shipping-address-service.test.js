import test from 'node:test';
import assert from 'node:assert/strict';
import { createShippingAddressService } from '../services/checkout/shippingAddressService.js';

const createService = () => createShippingAddressService({ addressRepository: {} });

const validCheckoutData = {
  firstName: 'Nguyễn',
  lastName: 'Văn An',
  email: 'an@example.com',
  phone: '0912345678',
  address: '12 Nguyễn Trãi',
  city: 'Hà Nội',
  state: 'Phường Bến Nghé',
  country: 'Vietnam'
};

test('checkout shipping data accepts valid Vietnamese recipient and address fields', async () => {
  const resolved = await createService().resolve(7, validCheckoutData);

  assert.equal(resolved.recipientName, 'Nguyễn Văn An');
  assert.equal(resolved.phone, '0912345678');
  assert.match(resolved.address, /12 Nguyễn Trãi/);
});

test('checkout rejects names containing digits or special characters', async () => {
  await assert.rejects(
    createService().resolve(7, { ...validCheckoutData, firstName: '0/' }),
    { code: 'VALIDATION_ERROR' }
  );
});

test('checkout rejects non-numeric or malformed phone numbers', async () => {
  await assert.rejects(
    createService().resolve(7, { ...validCheckoutData, phone: 'k' }),
    { code: 'VALIDATION_ERROR' }
  );
  await assert.rejects(
    createService().resolve(7, { ...validCheckoutData, phone: '12345' }),
    { code: 'VALIDATION_ERROR' }
  );
});

test('checkout rejects invalid email and incomplete Vietnamese addresses', async () => {
  await assert.rejects(
    createService().resolve(7, { ...validCheckoutData, email: 'not-an-email' }),
    { code: 'VALIDATION_ERROR' }
  );
  await assert.rejects(
    createService().resolve(7, { ...validCheckoutData, address: '   ' }),
    { code: 'VALIDATION_ERROR' }
  );
  await assert.rejects(
    createService().resolve(7, { ...validCheckoutData, state: '' }),
    { code: 'VALIDATION_ERROR' }
  );
});
