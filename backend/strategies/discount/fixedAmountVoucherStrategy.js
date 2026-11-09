import AppError from '../../utils/AppError.js';

const fixedAmountVoucherStrategy = {
  type: 'FIXED',

  calculate(subtotal, voucher) {
    const amount = Number(voucher.value);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new AppError('Voucher fixed amount must be greater than zero', 409, 'INVALID_VOUCHER');
    }
    const cappedAmount = voucher.maximumDiscount === null
      ? amount
      : Math.min(amount, Number(voucher.maximumDiscount));
    return Math.min(cappedAmount, subtotal);
  }
};

export { fixedAmountVoucherStrategy };
