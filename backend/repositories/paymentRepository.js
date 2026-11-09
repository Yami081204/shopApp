const createPaymentRepository = ({ db, Order, Payment, PaymentTransaction }) => ({
  transaction: (callback) => db.transaction(callback),

  findOrderForUpdate: (orderId, transaction) => Order.findByPk(orderId, {
    transaction,
    lock: transaction.LOCK.UPDATE
  }),

  findPaymentForUpdate: (orderId, transaction) => Payment.findOne({
    where: { orderId },
    transaction,
    lock: transaction.LOCK.UPDATE
  }),

  findPaymentByReference: (paymentReference, transaction) => Payment.findOne({
    where: { paymentReference },
    transaction
  }),

  findTransactionForUpdate: (where, transaction) => PaymentTransaction.findOne({
    where,
    transaction,
    lock: transaction.LOCK.UPDATE
  }),

  findTransactionByReference: (transactionReference, transaction) => PaymentTransaction.findOne({
    where: { transactionReference },
    transaction
  }),

  createPayment: (data, transaction) => Payment.create(data, { transaction }),
  createTransaction: (data, transaction) => PaymentTransaction.create(data, { transaction }),
  updateTransaction: (paymentTransaction, data, transaction) => paymentTransaction.update(data, { transaction }),
  updatePayment: (payment, data, transaction) => payment.update(data, { transaction }),
  updateOrder: (order, data, transaction) => order.update(data, { transaction })
});

export { createPaymentRepository };
