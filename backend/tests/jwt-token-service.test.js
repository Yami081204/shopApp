import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { createJwtTokenAdapter } from '../adapters/jwtTokenAdapter.js';

test('JWT token service encapsulates signing configuration and token IDs', () => {
  const service = createJwtTokenAdapter({
    secret: 'test-secret',
    expiresIn: '2h',
    tokenIdFactory: () => 'fixed-token-id'
  });
  const payload = jwt.verify(service.issue(42), 'test-secret');

  assert.equal(payload.id, 42);
  assert.equal(payload.jti, 'fixed-token-id');
  assert.ok(payload.exp > payload.iat);
});

test('JWT token service reports missing configuration explicitly', () => {
  const service = createJwtTokenAdapter({ secret: '' });
  assert.throws(() => service.issue(42), { code: 'AUTH_CONFIGURATION_ERROR' });
});
