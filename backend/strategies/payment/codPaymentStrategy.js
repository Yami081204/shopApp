import AppError from '../../utils/AppError.js';

const codPaymentStrategy = {
  method: 'COD',

  prepare({ amount, reference }) {
    return {
      method: this.method,
      status: 'PENDING',
      amount,
      reference,
      instructions: 'Pay the courier on delivery. An administrator must record the receipt reference to confirm payment.'
    };
  },

  planReport() {
    throw new AppError('Only VietQR payments can report a bank transfer', 409, 'CONFLICT');
  },

  planConfirmation({ order, existingTransaction }) {
    if (order.orderStatus !== 'DELIVERED') {
      throw new AppError(
        'COD payment can only be recorded after the order is delivered and cash is collected',
        409,
        'CONFLICT'
      );
    }
    if (existingTransaction) {
      throw new AppError('This receipt reference has already been recorded', 409, 'CONFLICT');
    }
    return { action: 'create' };
  },

  acceptsIncomingTransfer: false
};

export { codPaymentStrategy };
