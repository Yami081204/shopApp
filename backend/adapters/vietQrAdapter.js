import AppError from '../utils/AppError.js';

const createVietQrAdapter = ({ env = process.env } = {}) => ({
  isConfigured() {
    return Boolean(
      env.VIETQR_BANK_ID?.trim()
      && env.VIETQR_ACCOUNT_NUMBER?.trim()
      && env.VIETQR_ACCOUNT_NAME?.trim()
    );
  },

  createPaymentInstructions({ amount, reference, confirmationMode = 'automatic' }) {
    const bankId = env.VIETQR_BANK_ID?.trim();
    const accountNumber = env.VIETQR_ACCOUNT_NUMBER?.trim();
    const accountName = env.VIETQR_ACCOUNT_NAME?.trim();
    if (!this.isConfigured()) {
      throw new AppError('VietQR is not configured. Configure the shop bank account before accepting QR orders.', 503, 'PAYMENT_CONFIGURATION_ERROR');
    }

    const query = new URLSearchParams({
      amount: String(Math.round(amount)),
      addInfo: reference,
      accountName
    });
    return {
      method: 'VIETQR',
      status: 'PENDING',
      amount,
      reference,
      qrImageUrl: `https://img.vietqr.io/image/${encodeURIComponent(bankId)}-${encodeURIComponent(accountNumber)}-qr_only.png?${query.toString()}`,
      bankId,
      accountName,
      accountNumber,
      verification: confirmationMode === 'manual'
        ? 'Thanh toán bằng tiền thật. Đơn hàng chỉ được xác nhận sau khi admin đối chiếu giao dịch trong tài khoản ngân hàng.'
        : 'This QR image contains transfer information only. Payment status is updated automatically after SePay confirms the incoming transfer.'
    };
  }
});

export { createVietQrAdapter };
