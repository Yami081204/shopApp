const createCartRepository = ({ db, Cart, CartItem, Product, ProductVariant }) => ({
  transaction: (callback) => db.transaction(callback),

  getOrCreateCart: async (userId, transaction) => {
    const [cart] = await Cart.findOrCreate({
      where: { userId },
      defaults: { userId },
      transaction
    });
    return Cart.findByPk(cart.id, {
      transaction,
      lock: transaction?.LOCK?.UPDATE
    });
  },

  listItems: (cartId, transaction) => CartItem.findAll({
    where: { cartId },
    include: [{ model: Product }, { model: ProductVariant, as: 'variant' }],
    order: [['id', 'ASC']],
    transaction
  }),

  findProductForUpdate: (id, transaction) => Product.findByPk(id, {
    transaction,
    lock: transaction?.LOCK?.UPDATE
  }),

  countActiveVariants: (productId, transaction) => ProductVariant.count({
    where: { productId, isActive: true },
    transaction
  }),

  findVariantForUpdate: (id, productId, transaction) => ProductVariant.findOne({
    where: { id, productId, isActive: true },
    transaction,
    lock: transaction?.LOCK?.UPDATE
  }),

  findItemForUpdate: ({ cartId, productId, variantId }, transaction) => CartItem.findOne({
    where: { cartId, productId, variantId },
    transaction,
    lock: transaction?.LOCK?.UPDATE
  }),

  findItemForDisplay: (cartId, productId, variantId, transaction) => CartItem.findOne({
    where: { cartId, productId, variantId },
    include: [{ model: Product }, { model: ProductVariant, as: 'variant' }],
    transaction
  }),

  findItemByIdForUpdate: (id, transaction) => CartItem.findByPk(id, {
    include: [{ model: Cart }],
    transaction,
    lock: transaction?.LOCK?.UPDATE
  }),

  findItemById: (id) => CartItem.findByPk(id, { include: [{ model: Cart }] }),

  createItem: (data, transaction) => CartItem.create(data, { transaction }),

  saveItem: (item, updates, transaction) => item.update(updates, { transaction }),

  reloadItem: (item, transaction) => item.reload({
    include: [{ model: Product }, { model: ProductVariant, as: 'variant' }],
    transaction
  }),

  touchCart: (cart, transaction) => cart.update({ updatedAt: new Date() }, { transaction }),

  findCartByUser: (userId) => Cart.findOne({ where: { userId } }),

  deleteItem: (item) => item.destroy(),

  deleteItems: (cartId) => CartItem.destroy({ where: { cartId } })
});

export { createCartRepository };
