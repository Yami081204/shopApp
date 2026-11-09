import express from 'express';
import {
  createOrder,
  getPaymentMethods,
  getOrderById,
  getMyOrders,
  getOrders,
  cancelOrder,
  confirmOrderPayment,
  reportOrderPayment,
  simulateDemoOrderPayment,
  updateOrderToDelivered,
  getOrderStats,
  updateOrderStatus
} from '../controllers/orderController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/payment-methods', getPaymentMethods);
router.route('/')
  .post(protect, createOrder)
  .get(protect, admin, getOrders);

router.get('/myorders', protect, getMyOrders);
router.get('/stats', protect, admin, getOrderStats);

router.put('/:id/payment/confirm', protect, admin, confirmOrderPayment);
router.put('/:id/pay', protect, admin, confirmOrderPayment);
router.post('/:id/payment/report', protect, reportOrderPayment);
router.post('/:id/payment/demo-confirm', protect, simulateDemoOrderPayment);
router.put('/:id/deliver', protect, admin, updateOrderToDelivered);
router.put('/:id/status', protect, admin, updateOrderStatus);
router.put('/:id/cancel', protect, cancelOrder);
router.get('/:id', protect, getOrderById);

export default router;
