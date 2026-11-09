const createOrderNotificationObserver = ({ notificationRepository }) => async (event) => {
  if (!event.userId || !event.orderId) return;

  const notifications = {
    'order.created': {
      type: 'ORDER_CREATED',
      title: 'Order received',
      message: `Order ${event.orderNumber} was created and is awaiting payment.`
    },
    'order.status.changed': {
      type: 'ORDER_STATUS',
      title: 'Order status updated',
      message: `Order ${event.orderNumber} status changed to ${event.status}.`
    },
    'payment.confirmed': {
      type: 'PAYMENT_CONFIRMED',
      title: 'Payment confirmed',
      message: `Payment for order ${event.orderNumber} has been confirmed.`
    },
    'payment.reported': {
      type: 'PAYMENT_REPORTED',
      title: 'Transfer reported',
      message: `A bank transfer was reported for order ${event.orderNumber} and is awaiting administrator verification.`
    }
  };
  const notification = notifications[event.type];
  if (!notification) return;

  await notificationRepository.create({
    userId: event.userId,
    orderId: event.orderId,
    ...notification
  });
};

export { createOrderNotificationObserver };
