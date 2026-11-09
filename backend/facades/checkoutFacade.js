const createCheckoutFacade = ({ orderService, orderQueryService = orderService, paymentService }) => ({
  listPaymentMethods() {
    return {
      methods: paymentService.getAvailableMethods(),
      vietQrDemoMode: paymentService.isDemoVietQrEnabled(),
      vietQrManualConfirmation: paymentService.isManualVietQrEnabled()
    };
  },

  placeOrder(userId, body, idempotencyKey) {
    return orderService.createOrder(userId, body, idempotencyKey);
  },

  getOrder(orderId, user) {
    return orderQueryService.findOrderForUser(orderId, user).then((order) => {
      const orderData = typeof order.toJSON === 'function' ? order.toJSON() : order;
      const payment = orderData.payment;
      const isUnpaidVietQrOrder = payment?.paymentMethod === 'VIETQR'
        && payment.status === 'PENDING'
        && orderData.orderStatus !== 'CANCELLED';
      return isUnpaidVietQrOrder
        ? { ...orderData, paymentInstructions: paymentService.getPaymentInstructions(payment) }
        : orderData;
    });
  },

  listOrders(user, query) {
    return orderQueryService.listOrders(user, query);
  },

  cancelOrder(orderId, user) {
    return orderService.cancelOrder(orderId, user);
  },

  updateOrderStatus(orderId, status, userId, note) {
    return orderService.updateOrderStatus(orderId, status, userId, note);
  },

  getStats() {
    return orderQueryService.getStats();
  },

  confirmPayment(orderId, user, body) {
    return paymentService.confirmPayment(orderId, user, body);
  },

  reportTransfer(orderId, user, body) {
    return paymentService.reportTransfer(orderId, user, body);
  },

  simulateDemoPayment(orderId, user) {
    return paymentService.simulateDemoPayment(orderId, user);
  }
});

export { createCheckoutFacade };
