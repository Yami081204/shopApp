// User types
export interface User {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  status?: string;
  phone?: string;
  address?: string;
  avatarUrl?: string | null;
}

// Product types
export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  salePrice?: number | null;
  image: string;
  countInStock: number;
  isActive?: boolean;
  color?: string;
  brand?: string;
  rating: number;
  numReviews?: number;
  categoryId: number;
  createdAt?: string;
  updatedAt?: string;
  category?: {
    id: number;
    name: string;
  };
  variants?: ProductVariant[];
  // Frontend-specific fields
  stock?: number;
  isNew?: boolean;
  discountPercent?: number;
}

export interface ProductVariant {
  id: number;
  productId: number;
  sku: string;
  size: string;
  color: string;
  stock: number;
  isActive: boolean;
}

// Category types
export interface Category {
  id: number;
  name: string;
  description?: string;
  image?: string;
  createdAt?: string;
  updatedAt?: string;
  // Frontend-specific fields
  slug?: string;
  count?: number;
}

// Cart types
export interface CartItem {
  id?: number; // ID của cart item từ backend
  productId: number;
  product: Product;
  quantity: number;
  variantId?: number;
  variationId?: number;
  variant?: ProductVariant;
}

// Order types
export interface Order {
  id: number;
  orderNumber?: string;
  userId: number;
  user?: { id: number; name: string; email: string; phone?: string };
  orderItems: OrderItem[];
  shippingAddress: ShippingAddress | string;
  paymentMethod: string;
  payment?: {
    id: number;
    paymentReference: string;
    amount: number;
    paymentMethod: string;
    status: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'EXPIRED' | 'REFUNDED';
    createdAt?: string;
    confirmedAt?: string | null;
    confirmedBy?: number | null;
  };
  paymentTransactions?: Array<{
    id: number;
    transactionReference: string;
    amount: number;
    paymentMethod: string;
    status: string;
    reportedAt?: string | null;
    confirmedAt?: string | null;
    createdAt?: string;
    reportedBy?: number;
    confirmedBy?: number | null;
  }>;
  orderStatusHistories?: Array<{
    id: number;
    fromStatus?: string | null;
    toStatus: string;
    note?: string | null;
    changedBy?: number | null;
    createdAt?: string;
  }>;
  totalPrice: number;
  shippingPrice: number;
  discountPrice?: number;
  voucherCode?: string | null;
  paymentInstructions?: {
    method: string;
    status: string;
    amount: number;
    reference: string;
    qrImageUrl?: string;
    bankId?: string;
    accountName?: string;
    accountNumber?: string;
    demoMode?: boolean;
    instructions: string;
    verification?: string;
  };
  isPaid: boolean;
  paidAt?: Date;
  isDelivered: boolean;
  deliveredAt?: Date;
  status: string;
  orderStatus?: string;
  createdAt: Date;
}

export interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  productName?: string;
  productImage?: string;
  variantId?: number | null;
  variantSku?: string | null;
  variantSize?: string | null;
  variantColor?: string | null;
  product: Product;
  quantity: number;
  price: number;
}

export interface ShippingAddress {
  address: string;
  city: string;
  postalCode: string;
  country: string;
}

// Filter types
export interface CategoryFilter {
  name: string;
  slug: string;
  count: number;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ErrorResponse {
  message: string;
}