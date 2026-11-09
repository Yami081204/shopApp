import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import AppError from '../utils/AppError.js';

const createJwtTokenAdapter = ({
  secret,
  expiresIn = '1d',
  tokenIdFactory = randomUUID
} = {}) => ({
  issue(userId) {
    if (!secret) {
      throw new AppError('Authentication is not configured', 500, 'AUTH_CONFIGURATION_ERROR');
    }
    return jwt.sign({ id: userId, jti: tokenIdFactory() }, secret, { expiresIn });
  }
});

export { createJwtTokenAdapter };
