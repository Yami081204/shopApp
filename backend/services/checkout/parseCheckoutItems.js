import AppError from '../../utils/AppError.js';
import { parsePositiveInteger } from '../../utils/parsePositiveInteger.js';

const parseIdempotencyKey = (suppliedIdempotencyKey) => {
  const idempotencyKey = suppliedIdempotencyKey === undefined || suppliedIdempotencyKey === null
    ? null
    : String(suppliedIdempotencyKey).trim();
  if (idempotencyKey !== null && (!idempotencyKey || idempotencyKey.length > 64)) {
    throw new AppError('Idempotency-Key must contain 1 to 64 characters', 400, 'VALIDATION_ERROR');
  }
  return idempotencyKey;
};

const parseCheckoutItems = (body = {}) => {
  const items = body.items ?? body.cart;
  if (!Array.isArray(items) || items.length === 0 || items.length > 100) {
    throw new AppError('Order must contain between 1 and 100 products', 400, 'VALIDATION_ERROR');
  }

  const quantities = new Map();
  for (const item of items) {
    if (!item || typeof item !== 'object') {
      throw new AppError('Each order item must be an object', 400, 'VALIDATION_ERROR');
    }
    const productId = parsePositiveInteger(item.productId, 'productId');
    const rawVariantId = item.variantId ?? item.variationId;
    const variantId = rawVariantId === undefined || rawVariantId === null || rawVariantId === ''
      ? null
      : parsePositiveInteger(rawVariantId, 'variantId');
    const quantity = Number(item.quantity);
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 999) {
      throw new AppError('Item quantity must be an integer between 1 and 999', 400, 'VALIDATION_ERROR');
    }
    const key = `${productId}:${variantId ?? 'product'}`;
    const totalQuantity = (quantities.get(key)?.quantity || 0) + quantity;
    if (totalQuantity > 999) {
      throw new AppError('Total quantity per product cannot exceed 999', 400, 'VALIDATION_ERROR');
    }
    quantities.set(key, { productId, variantId, quantity: totalQuantity });
  }
  return [...quantities.values()];
};

export { parseCheckoutItems, parseIdempotencyKey };
