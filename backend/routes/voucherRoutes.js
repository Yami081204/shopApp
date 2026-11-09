import express from 'express';
import {
  getVouchers,
  createVoucher,
  updateVoucher,
  deactivateVoucher
} from '../controllers/voucherController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect, admin);
router.route('/')
  .get(getVouchers)
  .post(createVoucher);
router.route('/:id')
  .put(updateVoucher)
  .delete(deactivateVoucher);

export default router;
