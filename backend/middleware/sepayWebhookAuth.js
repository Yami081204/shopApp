import { timingSafeEqual } from 'crypto';
import AppError from '../utils/AppError.js';

const createSepayWebhookAuth = ({ apiKey = process.env.SEPAY_WEBHOOK_API_KEY } = {}) => (
  (req, res, next) => {
    if (!apiKey?.trim()) {
      next(new AppError('SePay webhook API key is not configured', 503, 'PAYMENT_CONFIGURATION_ERROR'));
      return;
    }

    const authorization = req.get('authorization') || '';
    const suppliedKey = authorization.match(/^Apikey\s+(.+)$/i)?.[1]?.trim() || '';
    const expected = Buffer.from(apiKey.trim());
    const supplied = Buffer.from(suppliedKey);
    if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
      next(new AppError('Invalid SePay webhook authorization', 401, 'UNAUTHENTICATED'));
      return;
    }

    next();
  }
);

export { createSepayWebhookAuth };
