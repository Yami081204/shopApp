import { cartService } from '../container.js';
import asyncHandler from '../utils/asyncHandler.js';

const getCart = asyncHandler(async (req, res) => {
  res.json(await cartService.getCart(req.user.id));
});

const addToCart = asyncHandler(async (req, res) => {
  const cartItem = await cartService.addItem(
    req.user.id,
    req.body?.productId,
    req.body?.quantity,
    req.body?.variantId ?? req.body?.variationId
  );
  res.status(201).json({ message: 'Item added to cart', cartItem });
});

const updateCartItem = asyncHandler(async (req, res) => {
  const cartItem = await cartService.updateItem(req.user.id, req.params.id, req.body?.quantity);
  res.json({ message: 'Cart updated', cartItem });
});

const removeFromCart = asyncHandler(async (req, res) => {
  await cartService.removeItem(req.user.id, req.params.id);
  res.json({ message: 'Item removed from cart' });
});

const clearCart = asyncHandler(async (req, res) => {
  await cartService.clearCart(req.user.id);
  res.json({ message: 'Cart cleared' });
});

const syncCart = asyncHandler(async (req, res) => {
  const cartItems = await cartService.syncItems(req.user.id, req.body?.items);
  res.json({ cartItems });
});

export { getCart, addToCart, updateCartItem, removeFromCart, clearCart, syncCart };
