import AppError from '../utils/AppError.js';
import { parsePositiveInteger } from '../utils/parsePositiveInteger.js';

const createCartService = ({ cartRepository }) => {
  const validateQuantity = (quantity) => {
    const parsed = Number(quantity);
    if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > 999) {
      throw new AppError('Quantity must be an integer between 1 and 999', 400, 'VALIDATION_ERROR');
    }
    return parsed;
  };

  const getCart = async (userId) => {
    const cart = await cartRepository.getOrCreateCart(userId);
    const cartItems = await cartRepository.listItems(cart.id);
    const subtotal = cartItems.reduce((sum, item) =>
      sum + Number(item.product?.salePrice ?? item.product?.price ?? 0) * item.quantity, 0);
    return { cart, cartItems, subtotal };
  };

  const addItem = async (userId, productId, quantity, variantId = null) => {
    const id = parsePositiveInteger(productId, 'productId');
    const amount = validateQuantity(quantity);
    const selectedVariantId = variantId === undefined || variantId === null || variantId === ''
      ? null
      : parsePositiveInteger(variantId, 'variantId');
    return cartRepository.transaction(async (transaction) => {
      const product = await cartRepository.findProductForUpdate(id, transaction);
      if (!product || !product.isActive) throw new AppError('Product not found', 404, 'NOT_FOUND');
      const activeVariantCount = await cartRepository.countActiveVariants(id, transaction);
      const variant = selectedVariantId
        ? await cartRepository.findVariantForUpdate(selectedVariantId, id, transaction)
        : null;
      if (selectedVariantId && !variant) throw new AppError('Selected product variant is unavailable', 409, 'CONFLICT');
      if (activeVariantCount > 0 && !variant) {
        throw new AppError('Choose a size and color before adding this product', 400, 'VARIANT_REQUIRED');
      }
      const cart = await cartRepository.getOrCreateCart(userId, transaction);
      const item = await cartRepository.findItemForUpdate({
        cartId: cart.id,
        productId: id,
        variantId: selectedVariantId
      }, transaction);
      const nextQuantity = amount + (item?.quantity || 0);
      if ((variant ? variant.stock : product.countInStock) < nextQuantity) {
        throw new AppError('Insufficient stock', 409, 'INSUFFICIENT_STOCK');
      }

      if (item) {
        await cartRepository.saveItem(item, {
          quantity: nextQuantity,
          price: product.price
        }, transaction);
      } else {
        await cartRepository.createItem({
          cartId: cart.id,
          productId: id,
          variantId: selectedVariantId,
          quantity: amount,
          price: product.salePrice ?? product.price
        }, transaction);
      }
      await cartRepository.touchCart(cart, transaction);
      return cartRepository.findItemForDisplay(cart.id, id, selectedVariantId, transaction);
    });
  };

  const updateItem = async (userId, itemId, quantity) => {
    const id = parsePositiveInteger(itemId, 'id');
    const amount = validateQuantity(quantity);
    return cartRepository.transaction(async (transaction) => {
      const item = await cartRepository.findItemByIdForUpdate(id, transaction);
      if (!item || item.cart.userId !== userId) throw new AppError('Cart item not found', 404, 'NOT_FOUND');
      const product = await cartRepository.findProductForUpdate(item.productId, transaction);
      if (!product || !product.isActive) throw new AppError('Product is no longer available', 409, 'CONFLICT');
      const variant = item.variantId
        ? await cartRepository.findVariantForUpdate(item.variantId, product.id, transaction)
        : null;
      const activeVariantCount = await cartRepository.countActiveVariants(product.id, transaction);
      if (item.variantId && !variant) throw new AppError('Selected product variant is unavailable', 409, 'CONFLICT');
      if (activeVariantCount > 0 && !variant) {
        throw new AppError('Choose a size and color for this product again', 409, 'CONFLICT');
      }
      if ((variant ? variant.stock : product.countInStock) < amount) {
        throw new AppError('Insufficient stock', 409, 'INSUFFICIENT_STOCK');
      }
      await cartRepository.saveItem(item, {
        quantity: amount,
        price: product.salePrice ?? product.price
      }, transaction);
      return cartRepository.reloadItem(item, transaction);
    });
  };

  const removeItem = async (userId, itemId) => {
    const id = parsePositiveInteger(itemId, 'id');
    const item = await cartRepository.findItemById(id);
    if (!item || item.cart.userId !== userId) throw new AppError('Cart item not found', 404, 'NOT_FOUND');
    await cartRepository.deleteItem(item);
  };

  const clearCart = async (userId) => {
    const cart = await cartRepository.findCartByUser(userId);
    if (!cart) return;
    await cartRepository.deleteItems(cart.id);
  };

  const syncItems = async (userId, items) => {
    if (!Array.isArray(items) || items.length > 100) {
      throw new AppError('Items must be an array with at most 100 entries', 400, 'VALIDATION_ERROR');
    }
    return cartRepository.transaction(async (transaction) => {
      const cart = await cartRepository.getOrCreateCart(userId, transaction);
      for (const entry of items) {
        if (!entry || typeof entry !== 'object') {
          throw new AppError('Each cart item must be an object', 400, 'VALIDATION_ERROR');
        }
        const productId = parsePositiveInteger(entry.productId, 'productId');
        const quantity = validateQuantity(entry.quantity);
        const product = await cartRepository.findProductForUpdate(productId, transaction);
        if (!product || !product.isActive) {
          throw new AppError(`Product ${productId} is unavailable`, 409, 'CONFLICT');
        }
        const variantId = entry.variantId ?? entry.variationId ?? null;
        const selectedVariantId = variantId === null || variantId === ''
          ? null
          : parsePositiveInteger(variantId, 'variantId');
        const activeVariantCount = await cartRepository.countActiveVariants(productId, transaction);
        const variant = selectedVariantId
          ? await cartRepository.findVariantForUpdate(selectedVariantId, productId, transaction)
          : null;
        if (selectedVariantId && !variant) {
          throw new AppError(`Variant for product ${productId} is unavailable`, 409, 'CONFLICT');
        }
        if (activeVariantCount > 0 && !variant) {
          throw new AppError(`Choose a size and color for product ${productId}`, 400, 'VARIANT_REQUIRED');
        }
        const existing = await cartRepository.findItemForUpdate({
          cartId: cart.id,
          productId,
          variantId: selectedVariantId
        }, transaction);
        const nextQuantity = quantity + (existing?.quantity || 0);
        if (nextQuantity > 999) {
          throw new AppError(`Quantity for product ${productId} exceeds 999`, 400, 'VALIDATION_ERROR');
        }
        if ((variant ? variant.stock : product.countInStock) < nextQuantity) {
          throw new AppError(`Insufficient stock for product ${productId}`, 409, 'INSUFFICIENT_STOCK');
        }
        if (existing) {
          await cartRepository.saveItem(existing, {
            quantity: nextQuantity,
            price: product.price
          }, transaction);
        } else {
          await cartRepository.createItem({
            cartId: cart.id,
            productId,
            variantId: selectedVariantId,
            quantity,
            price: product.salePrice ?? product.price
          }, transaction);
        }
      }
      await cartRepository.touchCart(cart, transaction);
      return cartRepository.listItems(cart.id, transaction);
    });
  };

  return { getCart, addItem, updateItem, removeItem, clearCart, syncItems };
};

export { createCartService };
