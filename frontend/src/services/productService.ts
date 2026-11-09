import axiosClient from '@/lib/axios';
import { Product, ProductVariant } from '@/types';

export interface ProductPage {
  rows: Product[];
  count: number;
  page: number;
  limit: number;
}

interface ApiProduct {
  id?: number;
  name?: string;
  description?: string;
  price?: number | string;
  salePrice?: number | string | null;
  categoryId?: number | string;
  rating?: number | string;
  numReviews?: number | string;
  image?: string | null;
  countInStock?: number | string;
  color?: string | null;
  brand?: string | null;
  createdAt?: string;
  updatedAt?: string;
  category?: { id?: number | string; name?: string } | null;
  discountPercent?: number | string;
  isActive?: boolean;
  variants?: Array<{
    id?: number;
    productId?: number;
    sku?: string;
    size?: string;
    color?: string;
    stock?: number | string;
    isActive?: boolean;
  }>;
}

// Map product from API to frontend format
const mapProductFromAPI = (product: ApiProduct): Product => {
  // Đảm bảo có các trường cơ bản
  return {
    id: product.id,
    name: product.name || '',
    description: product.description || '',
    // Đảm bảo các trường số
    price: typeof product.price === 'string' ? parseFloat(product.price) : Number(product.price || 0),
    salePrice: product.salePrice === null || product.salePrice === undefined
      ? null
      : Number(product.salePrice),
    categoryId: Number(product.categoryId || 0),
    rating: typeof product.rating === 'string' ? parseFloat(product.rating) : Number(product.rating || 0),
    numReviews: Number(product.numReviews || 0),
    
    // Đảm bảo các trường trạng thái và dữ liệu
    image: product.image || '/placeholder.svg',
    countInStock: Number(product.countInStock || 0),
    isActive: product.isActive,
    color: product.color || '',
    brand: product.brand || '',
    
    // Lưu lại các trường thời gian
    createdAt: product.createdAt || '',
    updatedAt: product.updatedAt || '',
    
    // Xử lý trường category nếu có
    category: product.category ? {
      id: Number(product.category.id || 0),
      name: product.category.name || ''
    } : undefined,
    
    // Các trường frontend bổ sung
    stock: Number(product.countInStock || 0),
    // Nếu sản phẩm được tạo trong vòng 14 ngày, đánh dấu là mới
    isNew: product.createdAt ? 
      new Date(product.createdAt).getTime() > Date.now() - 14 * 24 * 60 * 60 * 1000 : 
      false,
    discountPercent: product.salePrice !== null && product.salePrice !== undefined && Number(product.price) > 0
      ? Math.round((1 - Number(product.salePrice) / Number(product.price)) * 100)
      : product.discountPercent === undefined
        ? undefined
        : Number(product.discountPercent),
    variants: product.variants?.map((variant): ProductVariant => ({
      id: Number(variant.id),
      productId: Number(variant.productId ?? product.id),
      sku: variant.sku || '',
      size: variant.size || '',
      color: variant.color || '',
      stock: Number(variant.stock || 0),
      isActive: variant.isActive !== false
    }))
  };
};

// Get all products
export const getAllProducts = async (filters = {}): Promise<Product[]> => {
  const response = await axiosClient.get<ApiProduct[]>('/products', { params: filters });
  return response.data.map(mapProductFromAPI);
};

export const getProductsPage = async (
  filters: Record<string, string | number | undefined> = {}
): Promise<ProductPage> => {
  const response = await axiosClient.get<ApiProduct[]>('/products', { params: filters });
  return {
    rows: response.data.map(mapProductFromAPI),
    count: Number(response.headers['x-total-count'] || response.data.length),
    page: Number(response.headers['x-page'] || filters.page || 1),
    limit: Number(response.headers['x-limit'] || filters.limit || response.data.length)
  };
};

export const getManageProductsPage = async (
  filters: Record<string, string | number | undefined> = {}
): Promise<ProductPage> => {
  const response = await axiosClient.get<ApiProduct[]>('/products/manage', { params: filters });
  return {
    rows: response.data.map(mapProductFromAPI),
    count: Number(response.headers['x-total-count'] || response.data.length),
    page: Number(response.headers['x-page'] || filters.page || 1),
    limit: Number(response.headers['x-limit'] || filters.limit || response.data.length)
  };
};

// Get product by ID
export const getProductById = async (id: number): Promise<Product | null> => {
  const response = await axiosClient.get<ApiProduct>(`/products/${id}`);
  return mapProductFromAPI(response.data);
};

// Get products by category
export const getProductsByCategory = async (categoryId: string | number): Promise<Product[]> => {
  const response = await axiosClient.get<ApiProduct[]>(`/products/category/${categoryId}`);
  return response.data.map(mapProductFromAPI);
};

// Create a new product (admin only)
export const createProduct = async (productData: Omit<Product, 'id'>): Promise<Product | null> => {
  const response = await axiosClient.post<ApiProduct>('/products', productData);
  return mapProductFromAPI(response.data);
};

// Update a product (admin only)
export const updateProduct = async (id: number, productData: Partial<Product>): Promise<Product | null> => {
  const response = await axiosClient.put<ApiProduct>(`/products/${id}`, productData);
  return mapProductFromAPI(response.data);
};

// Delete a product (admin only)
export const deleteProduct = async (id: number): Promise<boolean> => {
  await axiosClient.delete(`/products/${id}`);
  return true;
};

export const productService = {
  getAllProducts,
  getProductsPage,
  getManageProductsPage,
  getProductById,
  getProductsByCategory,
  createProduct,
  updateProduct,
  deleteProduct
};