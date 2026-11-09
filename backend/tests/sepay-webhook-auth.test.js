import test from 'node:test';
import assert from 'node:assert/strict';
import { createSepayWebhookAuth } from '../middleware/sepayWebhookAuth.js';

const invoke = (middleware, authorization) => {
  let nextError;
  let nextCalled = false;
  middleware(
    { get: () => authorization },
    {},
    (error) => {
      nextError = error;
      nextCalled = true;
    }
  );
  return { nextError, nextCalled };
};

test('SePay webhook authentication accepts the configured API key', () => {
  const auth = createSepayWebhookAuth({ apiKey: 'secret-key' });
  assert.deepEqual(invoke(auth, 'Apikey secret-key'), {
    nextError: undefined,
    nextCalled: true
  });
});

test('SePay webhook authentication rejects a missing or incorrect API key', () => {
  const auth = createSepayWebhookAuth({ apiKey: 'secret-key' });
  assert.equal(invoke(auth, 'Apikey wrong-key').nextError.code, 'UNAUTHENTICATED');
  assert.equal(invoke(auth, undefined).nextError.code, 'UNAUTHENTICATED');
});

test('SePay webhook authentication reports missing server configuration', () => {
  const auth = createSepayWebhookAuth({ apiKey: '' });
  assert.equal(invoke(auth, 'Apikey anything').nextError.code, 'PAYMENT_CONFIGURATION_ERROR');
});
