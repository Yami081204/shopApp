import axiosClient from '@/lib/axios';
import { Order } from '@/types';

interface PaginatedOrdersResponse {
  data: Order[];
  count: number;
  page: number;
  limit: number;
}

interface OrdersPage {
  data: Order[];
  count: number;
  page: number;
  limit: number;
}

interface OrderStats {
  totalOrders: number;
  totalRevenue: number;
  totalProductsSold: number;
  pendingOrders: number;
  totalCustomers: number;
  totalProducts: number;
  revenueByMonth: Array<{ month: string; revenue: number }>;
  lowStockProducts: Array<{ id: number; name: string; countInStock: number }>;
  recentOrders: Order[];
  topSellingProducts: Array<{ productId: number; productName: string; quantitySold: number }>;
}

const createOrder = async (orderData: unknown, idempotencyKey?: string): Promise<Order> => {
  const response = await axiosClient.post<Order>('/orders', orderData, {
    headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined
  });
  return response.data;
};

const getOrderById = async (orderId: number): Promise<Order> => {
  const response = await axiosClient.get<Order>(`/orders/${orderId}`);
  return response.data;
};

const confirmPayment = async (
  id: number,
  transactionReference: string,
  amount: number
): Promise<Order> => {
  const response = await axiosClient.put<{ order: Order }>(`/orders/${id}/payment/confirm`, {
    transactionReference,
    amount
  });
  return response.data.order;
};

const reportPayment = async (
  id: number,
  transactionReference: string,
  amount: number
): Promise<void> => {
  await axiosClient.post(`/orders/${id}/payment/report`, {
    transactionReference,
    amount
  });
};

const simulateDemoPayment = async (id: number): Promise<Order> => {
  const response = await axiosClient.post<{ order: Order }>(`/orders/${id}/payment/demo-confirm`);
  return response.data.order;
};

const getMyOrders = async (): Promise<Order[]> => {
  const response = await axiosClient.get<Order[]>('/orders/myorders');
  return response.data;
};

const getOrdersPage = async (filters: Record<string, string | number | undefined> = {}): Promise<OrdersPage> => {
  const response = await axiosClient.get<PaginatedOrdersResponse>('/orders', { params: filters });
  return response.data;
};

const getAllOrders = async (filters: Record<string, string | number | undefined> = {}): Promise<Order[]> => {
  const response = await axiosClient.get<PaginatedOrdersResponse>('/orders', { params: filters });
  return response.data.data;
};

const updateOrderToDelivered = async (id: number): Promise<Order> => {
  const response = await axiosClient.put<Order>(`/orders/${id}/deliver`);
  return response.data;
};

const updateOrderStatus = async (id: string, status: string, note?: string): Promise<Order> => {
  const response = await axiosClient.put<{ data: Order }>(`/orders/${id}/status`, { status, note });
  return response.data.data;
};

const getUserOrders = getMyOrders;

const getOrderStats = async (): Promise<OrderStats> => {
  const response = await axiosClient.get<OrderStats>('/orders/stats');
  return response.data;
};

export {
  createOrder,
  getOrderById,
  confirmPayment,
  reportPayment,
  simulateDemoPayment,
  getMyOrders,
  getAllOrders,
  getOrdersPage,
  updateOrderToDelivered,
  updateOrderStatus,
  getUserOrders,
  getOrderStats
};

export const orderService = {
  createOrder,
  getOrderById,
  confirmPayment,
  reportPayment,
  simulateDemoPayment,
  getMyOrders,
  getAllOrders,
  getOrdersPage,
  updateOrderToDelivered,
  updateOrderStatus,
  getUserOrders,
  getOrderStats
};

export default orderService;
