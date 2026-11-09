import AppError from '../utils/AppError.js';

const transitions = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPING', 'CANCELLED'],
  SHIPPING: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: []
};

const normalizeOrderStatus = (status) => {
  const normalized = String(status || '').trim().toUpperCase();
  const aliases = { SHIPPED: 'SHIPPING' };
  const result = aliases[normalized] || normalized;
  if (!Object.hasOwn(transitions, result)) {
    throw new AppError('Invalid order status', 400, 'VALIDATION_ERROR');
  }
  return result;
};

const assertOrderTransition = (from, to) => {
  if (!transitions[from]?.includes(to)) {
    throw new AppError(`Order cannot transition from ${from} to ${to}`, 409, 'CONFLICT');
  }
};

export { normalizeOrderStatus, assertOrderTransition };
