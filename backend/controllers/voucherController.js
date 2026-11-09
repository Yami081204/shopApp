import { voucherService } from '../container.js';
import asyncHandler from '../utils/asyncHandler.js';

const getVouchers = asyncHandler(async (req, res) => {
  res.json(await voucherService.list());
});

const createVoucher = asyncHandler(async (req, res) => {
  res.status(201).json(await voucherService.create(req.body || {}));
});

const updateVoucher = asyncHandler(async (req, res) => {
  res.json(await voucherService.update(req.params.id, req.body || {}));
});

const deactivateVoucher = asyncHandler(async (req, res) => {
  res.json(await voucherService.deactivate(req.params.id));
});

export { getVouchers, createVoucher, updateVoucher, deactivateVoucher };
