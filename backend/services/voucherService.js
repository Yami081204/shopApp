import AppError from '../utils/AppError.js';
import { parsePositiveInteger } from '../utils/parsePositiveInteger.js';

const createVoucherService = ({ voucherRepository }) => {
  const validateVoucher = (data, existing = {}) => {
    const type = String(data.type ?? existing.type ?? '').trim().toUpperCase();
    const value = Number(data.value ?? existing.value);
    const minimumOrderAmount = Number(data.minimumOrderAmount ?? existing.minimumOrderAmount ?? 0);
    const maximumDiscountValue = Object.prototype.hasOwnProperty.call(data, 'maximumDiscount')
      ? data.maximumDiscount
      : existing.maximumDiscount;
    const maximumDiscount = maximumDiscountValue === '' || maximumDiscountValue === null || maximumDiscountValue === undefined
      ? null
      : Number(maximumDiscountValue);
    const usageLimitValue = Object.prototype.hasOwnProperty.call(data, 'usageLimit')
      ? data.usageLimit
      : existing.usageLimit;
    const usageLimit = usageLimitValue === '' || usageLimitValue === null || usageLimitValue === undefined
      ? null
      : Number(usageLimitValue);

    if (!['PERCENTAGE', 'FIXED'].includes(type)) {
      throw new AppError('Voucher type must be PERCENTAGE or FIXED', 400, 'VALIDATION_ERROR');
    }
    if (!Number.isFinite(value) || value <= 0 ||
        (type === 'PERCENTAGE' && value > 100)) {
      throw new AppError('Voucher value is invalid for its type', 400, 'VALIDATION_ERROR');
    }
    if (!Number.isFinite(minimumOrderAmount) || minimumOrderAmount < 0 ||
        (maximumDiscount !== null && (!Number.isFinite(maximumDiscount) || maximumDiscount <= 0)) ||
        (usageLimit !== null && (!Number.isSafeInteger(usageLimit) || usageLimit < 1))) {
      throw new AppError('Voucher limits must be valid non-negative values', 400, 'VALIDATION_ERROR');
    }

    const startsAtValue = Object.prototype.hasOwnProperty.call(data, 'startsAt')
      ? data.startsAt
      : existing.startsAt;
    const expiresAtValue = Object.prototype.hasOwnProperty.call(data, 'expiresAt')
      ? data.expiresAt
      : existing.expiresAt;
    const startsAt = startsAtValue ? new Date(startsAtValue) : null;
    const expiresAt = expiresAtValue ? new Date(expiresAtValue) : null;
    if ((startsAt && Number.isNaN(startsAt.getTime())) ||
        (expiresAt && Number.isNaN(expiresAt.getTime())) ||
        (startsAt && expiresAt && startsAt >= expiresAt)) {
      throw new AppError('Voucher dates are invalid', 400, 'VALIDATION_ERROR');
    }
    if (usageLimit !== null && usageLimit < Number(existing.usageCount || 0)) {
      throw new AppError('Usage limit cannot be lower than the number of redemptions', 409, 'CONFLICT');
    }
    const isActive = data.isActive ?? existing.isActive ?? true;
    if (typeof isActive !== 'boolean') {
      throw new AppError('Voucher active state must be a boolean', 400, 'VALIDATION_ERROR');
    }

    return {
      type,
      value,
      minimumOrderAmount,
      maximumDiscount,
      usageLimit,
      startsAt,
      expiresAt,
      isActive
    };
  };

  const list = () => voucherRepository.list();

  const create = async (data = {}) => {
    if (typeof data.code !== 'string' || !/^[A-Za-z0-9_-]{2,64}$/.test(data.code.trim())) {
      throw new AppError('Voucher code must be 2 to 64 letters, numbers, underscores or hyphens', 400, 'VALIDATION_ERROR');
    }
    return voucherRepository.create({
      code: data.code.trim().toUpperCase(),
      usageCount: 0,
      ...validateVoucher(data)
    });
  };

  const update = async (id, data = {}) => {
    const voucher = await voucherRepository.findById(parsePositiveInteger(id, 'id'));
    if (!voucher) throw new AppError('Voucher not found', 404, 'NOT_FOUND');
    const updates = validateVoucher(data, voucher);
    if (data.code !== undefined) {
      if (typeof data.code !== 'string' || !/^[A-Za-z0-9_-]{2,64}$/.test(data.code.trim())) {
        throw new AppError('Voucher code must be 2 to 64 letters, numbers, underscores or hyphens', 400, 'VALIDATION_ERROR');
      }
      updates.code = data.code.trim().toUpperCase();
    }
    const updated = await voucherRepository.update(voucher.id, updates);
    if (!updated) throw new AppError('Voucher not found', 404, 'NOT_FOUND');
    return updated;
  };

  const deactivate = async (id) => {
    const voucher = await voucherRepository.findById(parsePositiveInteger(id, 'id'));
    if (!voucher) throw new AppError('Voucher not found', 404, 'NOT_FOUND');
    const updated = await voucherRepository.update(voucher.id, { isActive: false });
    if (!updated) throw new AppError('Voucher not found', 404, 'NOT_FOUND');
    return updated;
  };

  return { list, create, update, deactivate };
};

export { createVoucherService };
