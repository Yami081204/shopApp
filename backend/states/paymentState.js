import AppError from '../utils/AppError.js';

const transitions = {
  PENDING: ['PAID', 'FAILED', 'CANCELLED', 'EXPIRED'],
  FAILED: ['PENDING', 'CANCELLED', 'EXPIRED'],
  EXPIRED: [],
  CANCELLED: [],
  PAID: ['REFUNDED'],
  REFUNDED: []
};

const assertPaymentTransition = (from, to) => {
  if (!transitions[from]?.includes(to)) {
    throw new AppError(`Payment cannot transition from ${from} to ${to}`, 409, 'CONFLICT');
  }
};

export { assertPaymentTransition };
