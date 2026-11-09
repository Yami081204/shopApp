
import { Product } from "@/types";

export const products: Product[] = [
];

export const categories = [
  { name: "Skincare", slug: "skincare", count: 15 },
  { name: "Makeup", slug: "makeup", count: 23 },
  { name: "Haircare", slug: "haircare", count: 8 },
  { name: "Fragrance", slug: "fragrance", count: 12 },
  { name: "Tools", slug: "tools", count: 6 },
];

export const getFeaturedProducts = () => {
  return products.filter(p => p.isNew || p.rating >= 4.7).slice(0, 4);
};

export const getProductById = (id: number) => {
  return products.find(p => p.id === id);
};
