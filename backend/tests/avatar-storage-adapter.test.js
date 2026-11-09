import test from 'node:test';
import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import path from 'node:path';
import { avatarDirectory, createAvatarStorageAdapter } from '../adapters/avatarStorageAdapter.js';

test('avatar storage accepts PNG images and returns a public avatar URL', async () => {
  const storage = createAvatarStorageAdapter();
  const image = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const avatarUrl = await storage.save(image, 'image/png');
  const filename = path.basename(avatarUrl);

  try {
    assert.match(avatarUrl, /^\/uploads\/avatars\/[\da-f-]+\.png$/i);
    await access(path.join(avatarDirectory, filename));
  } finally {
    await storage.remove(avatarUrl);
  }
});

test('avatar storage rejects unsupported and mismatched image data', async () => {
  const storage = createAvatarStorageAdapter();

  await assert.rejects(() => storage.save(Buffer.from('not an image'), 'image/png'), {
    code: 'VALIDATION_ERROR'
  });
  await assert.rejects(() => storage.save(Buffer.from('image'), 'image/svg+xml'), {
    code: 'VALIDATION_ERROR'
  });
});
