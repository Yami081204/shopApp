import axiosClient from '@/lib/axios';

export interface Voucher {
  id: number;
  code: string;
  type: 'PERCENTAGE' | 'FIXED';
  value: number;
  minimumOrderAmount: number;
  maximumDiscount: number | null;
  usageLimit: number | null;
  usageCount: number;
  startsAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
}

export interface VoucherPayload {
  code: string;
  type: Voucher['type'];
  value: number;
  minimumOrderAmount: number;
  maximumDiscount: number | null;
  usageLimit: number | null;
  startsAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
}

const getVouchers = async (): Promise<Voucher[]> => {
  const response = await axiosClient.get<Voucher[]>('/vouchers');
  return response.data;
};

const createVoucher = async (voucher: VoucherPayload): Promise<Voucher> => {
  const response = await axiosClient.post<Voucher>('/vouchers', voucher);
  return response.data;
};

const updateVoucher = async (id: number, voucher: VoucherPayload): Promise<Voucher> => {
  const response = await axiosClient.put<Voucher>(`/vouchers/${id}`, voucher);
  return response.data;
};

const deactivateVoucher = async (id: number): Promise<Voucher> => {
  const response = await axiosClient.delete<Voucher>(`/vouchers/${id}`);
  return response.data;
};

export const voucherService = { getVouchers, createVoucher, updateVoucher, deactivateVoucher };
