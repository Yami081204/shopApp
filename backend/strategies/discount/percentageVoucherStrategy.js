import AppError from '../../utils/AppError.js';

const percentageVoucherStrategy = {
  type: 'PERCENTAGE',

  calculate(subtotal, voucher) {
    const percentage = Number(voucher.value);
    if (!Number.isFinite(percentage) || percentage <= 0 || percentage > 100) {
      throw new AppError('Voucher percentage must be greater than 0 and no more than 100', 409, 'INVALID_VOUCHER');
    }
    const rawDiscount = subtotal * percentage / 100;
    return Math.min(rawDiscount, voucher.maximumDiscount === null ? rawDiscount : Number(voucher.maximumDiscount), subtotal);
  }
};

export { percentageVoucherStrategy };
