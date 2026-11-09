import { checkoutFacade } from '../container.js';
import asyncHandler from '../utils/asyncHandler.js';

const createOrder = asyncHandler(async (req, res) => {
  const order = await checkoutFacade.placeOrder(
    req.user.id,
    req.body || {},
    req.get('Idempotency-Key')
  );
  res.status(201).json(order);
});

const getPaymentMethods = asyncHandler(async (req, res) => {
  res.json(checkoutFacade.listPaymentMethods());
});

const getOrderById = asyncHandler(async (req, res) => {
  res.json(await checkoutFacade.getOrder(req.params.id, req.user));
});

const getMyOrders = asyncHandler(async (req, res) => {
  const result = await checkoutFacade.listOrders(req.user, req.query);
  res.json(result.rows);
});

const getOrders = asyncHandler(async (req, res) => {
  const result = await checkoutFacade.listOrders(req.user, req.query);
  res.json({
    data: result.rows,
    count: result.count,
    page: result.page,
    limit: result.limit,
    message: 'Orders fetched successfully'
  });
});

const cancelOrder = asyncHandler(async (req, res) => {
  res.json(await checkoutFacade.cancelOrder(req.params.id, req.user));
});

const confirmOrderPayment = asyncHandler(async (req, res) => {
  const result = await checkoutFacade.confirmPayment(req.params.id, req.user, req.body || {});
  res.json({
    message: 'Payment confirmed',
    order: result.order,
    transaction: result.paymentTransaction
  });
});

const reportOrderPayment = asyncHandler(async (req, res) => {
  const result = await checkoutFacade.reportTransfer(req.params.id, req.user, req.body || {});
  res.status(201).json({
    message: 'Transfer report submitted; payment remains pending until administrator verification.',
    transaction: result.paymentTransaction
  });
});

const simulateDemoOrderPayment = asyncHandler(async (req, res) => {
  const result = await checkoutFacade.simulateDemoPayment(req.params.id, req.user);
  res.json({
    message: 'Demo payment completed; no real money was transferred.',
    order: result.order,
    transaction: result.paymentTransaction
  });
});

const updateOrderStatus = asyncHandler(async (req, res) => {
  if (String(req.body?.status).toUpperCase() === 'CANCELLED') {
    const order = await checkoutFacade.cancelOrder(req.params.id, req.user);
    res.json({ data: order, message: 'Order cancelled successfully' });
    return;
  }
  const order = await checkoutFacade.updateOrderStatus(
    req.params.id,
    req.body?.status,
    req.user.id,
    req.body?.note
  );
  res.json({ data: order, message: 'Order status updated successfully' });
});

const updateOrderToDelivered = asyncHandler(async (req, res) => {
  const order = await checkoutFacade.updateOrderStatus(
    req.params.id,
    'DELIVERED',
    req.user.id,
    req.body?.note
  );
  res.json(order);
});

const getOrderStats = asyncHandler(async (req, res) => {
  res.json(await checkoutFacade.getStats());
});

export {
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
};
