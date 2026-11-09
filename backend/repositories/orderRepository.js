import { col, fn, literal, Op } from 'sequelize';

const createOrderRepository = ({
  db,
  Address,
  Cart,
  CartItem,
  Order,
  OrderItem,
  OrderStatusHistory,
  Payment,
  PaymentTransaction,
  Product,
  ProductVariant,
  User
}) => {
  const repository = {
  transaction: (callback) => db.transaction(callback),

  findAddress: (userId, addressId, transaction) => Address.findOne({
    where: { id: addressId, userId },
    transaction
  }),

  findProductForUpdate: (id, transaction) => Product.findByPk(id, {
    transaction,
    lock: transaction.LOCK.UPDATE
  }),

  findVariantForUpdate: (id, productId, transaction) => ProductVariant.findOne({
    where: { id, productId, isActive: true },
    transaction,
    lock: transaction.LOCK.UPDATE
  }),

  hasActiveVariants: (productId, transaction) => ProductVariant.count({
    where: { productId, isActive: true },
    transaction
  }),

  decrementStock: (productId, quantity, transaction) => Product.update(
    { countInStock: literal(`countInStock - ${quantity}`) },
    {
      where: { id: productId, isActive: true, countInStock: { [Op.gte]: quantity } },
      transaction
    }
  ),

  decrementVariantStock: (variantId, productId, quantity, transaction) => ProductVariant.update(
    { stock: literal(`stock - ${quantity}`) },
    {
      where: { id: variantId, productId, isActive: true, stock: { [Op.gte]: quantity } },
      transaction
    }
  ),

  syncProductStockFromVariants: async (productId, transaction) => {
    const total = await ProductVariant.sum('stock', {
      where: { productId, isActive: true },
      transaction
    });
    await Product.update({ countInStock: Number(total || 0) }, {
      where: { id: productId },
      transaction
    });
  },

  restoreStock: (productId, quantity, transaction) => Product.increment('countInStock', {
    by: quantity,
    where: { id: productId },
    transaction
  }),

  restoreVariantStock: (variantId, quantity, transaction) => ProductVariant.increment('stock', {
    by: quantity,
    where: { id: variantId },
    transaction
  }),

  createOrder: (data, transaction) => Order.create(data, { transaction }),
  findOrderByIdempotencyKey: (idempotencyKey, userId, transaction) => Order.findOne({
    where: { idempotencyKey, userId },
    include: [{ model: OrderItem }, { model: Payment }, { model: PaymentTransaction }],
    transaction,
    ...(transaction ? { lock: transaction.LOCK.UPDATE } : {})
  }),
  createOrderItems: (items, transaction) => OrderItem.bulkCreate(items, { transaction }),
  createStatusHistory: (data, transaction) => OrderStatusHistory.create(data, { transaction }),

  clearPurchasedCartItems: async (userId, orderLines, transaction) => {
    const cart = await Cart.findOne({ where: { userId }, transaction });
    if (cart) {
      for (const line of orderLines) {
        await CartItem.destroy({
          where: {
            cartId: cart.id,
            productId: line.productId,
            variantId: line.variantId ?? null
          },
          transaction
        });
      }
    }
  },

  findOrder: (id, where = {}, transaction) => Order.findOne({
    where: { id, ...where },
    include: [
      { model: OrderItem, include: [{ model: Product }] },
      { model: Payment },
      { model: PaymentTransaction },
      { model: OrderStatusHistory, separate: true, order: [['createdAt', 'ASC']] }
    ],
    transaction
  }),

  findOrders: (where, { limit, offset }) => Order.findAndCountAll({
    where,
    include: [
      { model: User, attributes: ['id', 'name', 'email', 'phone'] },
      { model: OrderItem, include: [{ model: Product }] },
      { model: Payment },
      { model: PaymentTransaction }
    ],
    order: [['createdAt', 'DESC']],
    limit,
    offset,
    distinct: true
  }),

  findOrderForUpdate: (id, where, transaction, includeItems = false) => Order.findOne({
    where: { id, ...where },
    include: includeItems ? [{ model: OrderItem }] : [],
    transaction,
    lock: transaction.LOCK.UPDATE
  }),

  updateOrder: (order, data, transaction) => order.update(data, { transaction }),

  countOrders: () => Order.count(),
  countPendingOrders: () => Order.count({
    where: { orderStatus: { [Op.in]: ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPING'] } }
  }),
  countCustomers: () => User.count({ where: { isAdmin: false } }),
  countActiveProducts: () => Product.count({ where: { isActive: true } }),
  findLowStockProducts: () => Product.findAll({
    where: { isActive: true, countInStock: { [Op.lte]: 5 } },
    attributes: ['id', 'name', 'countInStock'],
    order: [['countInStock', 'ASC']],
    limit: 5,
    raw: true
  }),
  findRecentOrders: async () => (await Order.findAll({
    include: [
      { model: User, attributes: ['id', 'name', 'email', 'phone'] },
      { model: Payment, attributes: ['status', 'paymentMethod', 'amount'] }
    ],
    order: [['createdAt', 'DESC']],
    limit: 5
  })),
  findTopSellingProducts: () => OrderItem.findAll({
    attributes: [
      'productId',
      'productName',
      [fn('SUM', col('quantity')), 'quantitySold']
    ],
    include: [{
      model: Order,
      attributes: [],
      where: { orderStatus: { [Op.ne]: 'CANCELLED' } },
      required: true
    }],
    group: ['productId', 'productName'],
    order: [[literal('quantitySold'), 'DESC']],
    limit: 5,
    raw: true
  }),
  findPaidPayments: () => Payment.findAll({
    where: { status: 'PAID' },
    attributes: ['orderId', 'amount', 'confirmedAt'],
    raw: true
  }),
  sumOrderItems: (orderIds) => OrderItem.sum('quantity', {
    where: { orderId: { [Op.in]: orderIds } }
  })
  };

  return {
    ...repository,
    addresses: {
      findAddress: repository.findAddress
    },
    inventory: {
      findProductForUpdate: repository.findProductForUpdate,
      findVariantForUpdate: repository.findVariantForUpdate,
      hasActiveVariants: repository.hasActiveVariants,
      decrementStock: repository.decrementStock,
      decrementVariantStock: repository.decrementVariantStock,
      syncProductStockFromVariants: repository.syncProductStockFromVariants,
      restoreStock: repository.restoreStock,
      restoreVariantStock: repository.restoreVariantStock
    },
    commands: {
      transaction: repository.transaction,
      createOrder: repository.createOrder,
      findOrderByIdempotencyKey: repository.findOrderByIdempotencyKey,
      createOrderItems: repository.createOrderItems,
      createStatusHistory: repository.createStatusHistory,
      clearPurchasedCartItems: repository.clearPurchasedCartItems,
      findOrder: repository.findOrder,
      findOrderForUpdate: repository.findOrderForUpdate,
      updateOrder: repository.updateOrder
    },
    query: {
      findOrder: repository.findOrder,
      searchOrders: ({ userId, status, search, limit, offset }) => {
        const where = {};
        if (userId !== null) where.userId = userId;
        if (status) where.orderStatus = status;
        if (search) {
          where[Op.or] = [
            { orderNumber: { [Op.like]: `%${search}%` } },
            ...(Number.isInteger(Number(search)) ? [{ id: Number(search) }] : [])
          ];
        }
        return repository.findOrders(where, { limit, offset });
      }
    },
    stats: {
      findPaidPayments: repository.findPaidPayments,
      countOrders: repository.countOrders,
      countPendingOrders: repository.countPendingOrders,
      countCustomers: repository.countCustomers,
      countActiveProducts: repository.countActiveProducts,
      findLowStockProducts: repository.findLowStockProducts,
      findRecentOrders: repository.findRecentOrders,
      findTopSellingProducts: repository.findTopSellingProducts,
      sumOrderItems: repository.sumOrderItems
    }
  };
};

export { createOrderRepository };
