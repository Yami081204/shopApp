import axiosClient from '@/lib/axios';
import { CartItem, Product } from '@/types';

interface ApiCartItem {
  id: number;
  productId: number;
  Product?: Product;
  product?: Product;
  quantity: number;
  variantId?: number | null;
  variationId?: number | null;
  variant?: CartItem['variant'];
}

const mapCartItem = (item: ApiCartItem): CartItem => {
  const product = item.Product ?? item.product;
  if (!product) {
    throw new Error('Cart API response did not include product details.');
  }

  return {
    id: item.id,
    productId: item.productId,
    product,
    quantity: item.quantity,
    variantId: item.variantId ?? item.variationId ?? undefined,
    variant: item.variant ?? undefined
  };
};

// Get user cart
export const getCart = async (): Promise<CartItem[]> => {
  const response = await axiosClient.get<{ cartItems: ApiCartItem[] }>('/cart');
  if (!Array.isArray(response.data.cartItems)) {
    throw new Error('Cart API response did not include cart items.');
  }
  return response.data.cartItems.map(mapCartItem);
};

// Add item to cart
export const addToCart = async (productId: number, quantity: number, variantId?: number): Promise<CartItem> => {
  const response = await axiosClient.post<{ cartItem?: ApiCartItem }>('/cart', {
    productId,
    quantity,
    variantId
  });
  if (!response.data.cartItem) {
    throw new Error('Cart API response did not include the added item.');
  }
  return mapCartItem(response.data.cartItem);
};

// Update cart item quantity
export const updateCartItem = async (cartItemId: number, quantity: number): Promise<CartItem> => {
  const response = await axiosClient.put<{ cartItem?: ApiCartItem }>(`/cart/${cartItemId}`, {
    quantity
  });
  if (!response.data.cartItem) {
    throw new Error('Cart API response did not include the updated item.');
  }
  return mapCartItem(response.data.cartItem);
};

// Remove item from cart
export const removeFromCart = async (cartItemId: number): Promise<void> => {
  await axiosClient.delete(`/cart/${cartItemId}`);
};

// Clear cart
export const clearCart = async (): Promise<void> => {
  await axiosClient.delete('/cart');
};

export const cartService = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart
};