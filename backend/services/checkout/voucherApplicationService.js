import AppError from '../../utils/AppError.js';

const createVoucherApplicationService = ({
  voucherRepository,
  discountStrategyFactory,
  now = () => new Date()
}) => ({
  async apply(code, subtotal, transaction) {
    if (!code) {
      const strategy = discountStrategyFactory.forVoucher(null);
      return { voucher: null, discount: strategy.calculate(subtotal) };
    }
    if (typeof code !== 'string' || code.trim().length > 64) {
      throw new AppError('Voucher code must be a string of at most 64 characters', 400, 'VALIDATION_ERROR');
    }

    const voucher = await voucherRepository.findByCodeForUpdate(code.trim().toUpperCase(), transaction);
    if (!voucher || !voucher.isActive) throw new AppError('Voucher is invalid or inactive', 409, 'INVALID_VOUCHER');
    const currentTime = now();
    if ((voucher.startsAt && new Date(voucher.startsAt) > currentTime) ||
        (voucher.expiresAt && new Date(voucher.expiresAt) <= currentTime)) {
      throw new AppError('Voucher is not currently valid', 409, 'INVALID_VOUCHER');
    }
    if (voucher.usageLimit !== null && voucher.usageCount >= voucher.usageLimit) {
      throw new AppError('Voucher usage limit has been reached', 409, 'INVALID_VOUCHER');
    }
    if (subtotal < Number(voucher.minimumOrderAmount)) {
      throw new AppError('Order does not meet the voucher minimum amount', 409, 'INVALID_VOUCHER');
    }
    const strategy = discountStrategyFactory.forVoucher(voucher);
    return { voucher, discount: strategy.calculate(subtotal, voucher) };
  },

  async consume(voucher, transaction) {
    if (!voucher) return;
    if (!(await voucherRepository.consume(voucher, transaction))) {
      throw new AppError('Voucher usage limit has been reached', 409, 'INVALID_VOUCHER');
    }
  }
});

export { createVoucherApplicationService };
