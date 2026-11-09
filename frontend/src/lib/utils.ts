import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format giá tiền theo định dạng VND
export const formatVND = (price: number): string => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(price);
};

// Tương thích với code cũ - deprecated, sử dụng formatVND thay thế
export const formatPrice = (price: number): string => {
  return formatVND(price);
};
