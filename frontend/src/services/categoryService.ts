import axiosClient from '@/lib/axios';
import { Category } from '@/types';

interface ApiCategory extends Category {
  slug?: string;
  count?: number;
}

const mapCategoryFromAPI = (category: ApiCategory): Category => {
  return {
    ...category,
    // Tạo slug từ tên danh mục nếu không có sẵn
    slug: category.slug || category.name.toLowerCase().replace(/\s+/g, '-'),
    // Các trường khác nếu cần
    count: category.count || 0 
  };
};

// Get all categories
export const getAllCategories = async (): Promise<Category[]> => {
  const response = await axiosClient.get<ApiCategory[]>('/categories');
  return response.data.map(mapCategoryFromAPI);
};

// Get category by ID
export const getCategoryById = async (id: number): Promise<Category> => {
  const response = await axiosClient.get<Category>(`/categories/${id}`);
  return mapCategoryFromAPI(response.data);
};

// Create a new category (admin only)
export const createCategory = async (categoryData: Omit<Category, 'id'>): Promise<Category | null> => {
  const response = await axiosClient.post<Category>('/categories', categoryData);
  return mapCategoryFromAPI(response.data);
};

// Update a category (admin only)
export const updateCategory = async (id: number, categoryData: Partial<Category>): Promise<Category | null> => {
  const response = await axiosClient.put<Category>(`/categories/${id}`, categoryData);
  return mapCategoryFromAPI(response.data);
};

// Delete a category (admin only)
export const deleteCategory = async (id: number): Promise<boolean> => {
  await axiosClient.delete(`/categories/${id}`);
  return true;
};

export const categoryService = {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
};