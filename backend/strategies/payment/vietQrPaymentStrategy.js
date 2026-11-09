import AppError from '../../utils/AppError.js';

const createVietQrPaymentStrategy = ({
  vietQrAdapter,
  mode = 'live',
  isAutomaticConfirmationEnabled = () => true
} = {}) => ({
  method: 'VIETQR',
  acceptsIncomingTransfer: true,

  isAvailable({ isAutomaticConfirmationEnabled: automaticConfirmationEnabled = true } = {}) {
    if (mode === 'demo') return true;
    if (!vietQrAdapter?.isConfigured()) return false;
    if (mode === 'manual') return true;
    return automaticConfirmationEnabled && isAutomaticConfirmationEnabled();
  },

  unavailableMessage({ isAutomaticConfirmationEnabled: automaticConfirmationEnabled = true } = {}) {
    if (mode === 'demo') return 'VietQR demo mode is enabled';
    if (!vietQrAdapter?.isConfigured()) {
      return 'VietQR is not configured. Select cash on delivery or configure the shop bank account.';
    }
    if (mode === 'manual') return 'VietQR is configured for administrator-reviewed payments';
    if (!automaticConfirmationEnabled || !isAutomaticConfirmationEnabled()) {
      return 'Automatic VietQR confirmation is not configured. Configure the SePay webhook before accepting QR payments.';
    }
    return 'Payment method is unavailable';
  },

  prepare({ amount, reference }) {
    if (mode === 'demo') {
      return {
        method: 'VIETQR',
        status: 'PENDING',
        amount,
        reference,
        demoMode: true,
        instructions: 'Đây là thanh toán mô phỏng cho mục đích demo. Không quét mã hoặc chuyển tiền thật.',
        verification: 'Không có giao dịch ngân hàng thật. Dùng nút mô phỏng thanh toán để hoàn tất demo.'
      };
    }

    return {
      ...vietQrAdapter.createPaymentInstructions({
        amount,
        reference,
        confirmationMode: mode
      }),
      instructions: mode === 'manual'
        ? 'Quét mã QR để chuyển đúng số tiền và giữ nguyên nội dung chuyển khoản. Đơn sẽ được cập nhật sau khi admin kiểm tra giao dịch ngân hàng.'
        : 'Scan the QR code and transfer the exact amount. Payment status will update automatically after the bank confirms the transfer.'
    };
  },

  planReport({ payment, order }) {
    if (payment.status !== 'PENDING' || order.orderStatus === 'CANCELLED') {
      throw new AppError('This payment is not awaiting a transfer report', 409, 'CONFLICT');
    }
    return { action: 'report' };
  },

  planConfirmation({ existingTransaction, amount }) {
    if (!existingTransaction || existingTransaction.status !== 'PENDING') {
      throw new AppError('No unconfirmed transfer report exists for this order and reference', 409, 'CONFLICT');
    }
    if (Number(existingTransaction.amount) !== Number(amount)) {
      throw new AppError('Reported transfer amount does not match the order payment', 409, 'CONFLICT');
    }
    return { action: 'use-existing' };
  }
});

export { createVietQrPaymentStrategy };
