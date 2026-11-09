import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import AppError from '../utils/AppError.js';

const avatarDirectory = fileURLToPath(new URL('../uploads/avatars/', import.meta.url));
const maxAvatarBytes = 2 * 1024 * 1024;
const formats = {
  'image/jpeg': {
    extension: '.jpg',
    matches: (buffer) => buffer.length >= 3 &&
      buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
  },
  'image/png': {
    extension: '.png',
    matches: (buffer) => buffer.length >= 8 &&
      buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  },
  'image/webp': {
    extension: '.webp',
    matches: (buffer) => buffer.length >= 12 &&
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP'
  }
};

const createAvatarStorageAdapter = () => ({
  async save(buffer, contentType) {
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
      throw new AppError('Choose an image to upload', 400, 'VALIDATION_ERROR');
    }
    if (buffer.length > maxAvatarBytes) {
      throw new AppError('Avatar image must be 2 MB or smaller', 413, 'PAYLOAD_TOO_LARGE');
    }

    const format = formats[contentType];
    if (!format || !format.matches(buffer)) {
      throw new AppError('Avatar must be a valid JPEG, PNG, or WebP image', 400, 'VALIDATION_ERROR');
    }

    await mkdir(avatarDirectory, { recursive: true });
    const filename = `${randomUUID()}${format.extension}`;
    await writeFile(path.join(avatarDirectory, filename), buffer, { flag: 'wx' });
    return `/uploads/avatars/${filename}`;
  },

  async remove(url) {
    const filename = path.basename(url || '');
    if (filename === '.' || filename === path.sep || !/^[\da-f-]+\.(jpg|png|webp)$/i.test(filename)) return;
    await unlink(path.join(avatarDirectory, filename));
  }
});

export { createAvatarStorageAdapter, avatarDirectory };
