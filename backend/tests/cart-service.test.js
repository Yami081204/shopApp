import test from 'node:test';
import assert from 'node:assert/strict';
import { createCartService } from '../services/cartService.js';

const makeCartService = () => {
  const products = new Map([[3, {
    id: 3,
    isActive: true,
    price: 120,
    salePrice: 100,
    countInStock: 8
  }]]);
  const carts = new Map();
  const items = [];
  let nextItemId = 1;
  const cartRepository = {
    transaction: (callback) => callback({ LOCK: { UPDATE: true } }),
    getOrCreateCart: async (userId) => {
      if (!carts.has(userId)) carts.set(userId, { id: userId, userId });
      return carts.get(userId);
    },
    listItems: async (cartId) => items.filter((item) => item.cartId === cartId).map((item) => ({
      ...item,
      product: products.get(item.productId)
    })),
    findProductForUpdate: async (id) => products.get(id) || null,
    countActiveVariants: async () => 0,
    findVariantForUpdate: async () => null,
    findItemForUpdate: async ({ cartId, productId, variantId }) => items.find((item) =>
      item.cartId === cartId && item.productId === productId && item.variantId === variantId
    ) || null,
    findItemForDisplay: async (cartId, productId, variantId) => {
      const item = items.find((entry) =>
        entry.cartId === cartId && entry.productId === productId && entry.variantId === variantId
      );
      return item ? { ...item, product: products.get(productId) } : null;
    },
    findItemByIdForUpdate: async (id) => {
      const item = items.find((entry) => entry.id === id);
      return item ? { ...item, cart: carts.get(item.cartId), save: async function save() {} } : null;
    },
    findItemById: async (id) => {
      const item = items.find((entry) => entry.id === id);
      return item ? { ...item, cart: carts.get(item.cartId) } : null;
    },
    createItem: async (data) => {
      const item = { id: nextItemId++, ...data };
      items.push(item);
      return item;
    },
    saveItem: async (item, updates) => Object.assign(item, updates),
    reloadItem: async (item) => ({ ...item, product: products.get(item.productId) }),
    touchCart: async () => {},
    deleteItem: async (item) => {
      const index = items.findIndex((entry) => entry.id === item.id);
      if (index >= 0) items.splice(index, 1);
    },
    findCartByUser: async (userId) => carts.get(userId) || null,
    deleteItems: async (cartId) => {
      for (let index = items.length - 1; index >= 0; index -= 1) {
        if (items[index].cartId === cartId) items.splice(index, 1);
      }
    }
  };
  return { service: createCartService({ cartRepository }), items };
};

test('cart service delegates persistence and enforces ownership, quantity, and stock rules', async () => {
  const { service, items } = makeCartService();
  const added = await service.addItem(7, 3, 2);
  assert.equal(added.quantity, 2);
  assert.equal((await service.getCart(7)).subtotal, 200);

  await service.addItem(7, 3, 1);
  assert.equal(items[0].quantity, 3);
  await assert.rejects(() => service.updateItem(8, items[0].id, 1), { code: 'NOT_FOUND' });
  await assert.rejects(() => service.addItem(7, 3, 6), { code: 'INSUFFICIENT_STOCK' });

  await service.removeItem(7, items[0].id);
  assert.equal(items.length, 0);
});
