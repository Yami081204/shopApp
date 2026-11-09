import axiosClient from '@/lib/axios';

export type PaymentMethod = 'COD' | 'VIETQR';

interface PaymentMethods {
  methods: PaymentMethod[];
  vietQrDemoMode: boolean;
  vietQrManualConfirmation: boolean;
}

const getAvailableMethods = async (): Promise<PaymentMethods> => {
  const response = await axiosClient.get<PaymentMethods>('/orders/payment-methods');
  if (!Array.isArray(response.data.methods)) {
    throw new Error('Payment methods response is invalid.');
  }
  return {
    methods: response.data.methods,
    vietQrDemoMode: response.data.vietQrDemoMode === true,
    vietQrManualConfirmation: response.data.vietQrManualConfirmation === true
  };
};

export const paymentService = { getAvailableMethods };
