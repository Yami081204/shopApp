import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Info, Package, PackageCheck, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { orderService } from '@/services';
import { Order, ShippingAddress } from '@/types';
import { getApiErrorMessage } from '@/lib/apiError';

const currency = (amount: number) => new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0
}).format(Number(amount) || 0);

const getAddressText = (address: Order['shippingAddress']) => {
  if (typeof address === 'string') return address;
  const typedAddress = address as ShippingAddress;
  return [typedAddress.address, typedAddress.city, typedAddress.postalCode, typedAddress.country]
    .filter(Boolean)
    .join(', ');
};

const OrderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paymentRefreshError, setPaymentRefreshError] = useState('');
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);

  useEffect(() => {
    let active = true;
    const orderId = Number(id);
    if (!Number.isInteger(orderId) || orderId < 1) {
      setError('Mã đơn hàng không hợp lệ.');
      setLoading(false);
      return () => { active = false; };
    }

    orderService.getOrderById(orderId).then((data) => {
      if (active) setOrder(data);
    }).catch((requestError: unknown) => {
      if (active) setError((requestError as Error).message || 'Không thể tải đơn hàng.');
    }).finally(() => {
      if (active) setLoading(false);
    });

    return () => { active = false; };
  }, [id]);

  const shouldPollPayment = order?.paymentMethod === 'VIETQR'
    && !order.isPaid
    && order.payment?.status !== 'PAID';

  useEffect(() => {
    if (!shouldPollPayment) return;

    let active = true;
    let refreshing = false;
    const refreshPaymentStatus = async () => {
      if (refreshing) return;
      refreshing = true;
      try {
        const updatedOrder = await orderService.getOrderById(Number(id));
        if (active) {
          setOrder(updatedOrder);
          setPaymentRefreshError('');
        }
      } catch (requestError) {
        if (active) {
          setPaymentRefreshError(
            requestError instanceof Error
              ? requestError.message
              : 'Không thể cập nhật trạng thái thanh toán.'
          );
        }
      } finally {
        refreshing = false;
      }
    };

    const intervalId = window.setInterval(() => {
      void refreshPaymentStatus();
    }, 10000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [id, shouldPollPayment]);

  if (loading) {
    return (
      <div className="container min-h-[60vh] space-y-4 py-10">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-56 animate-pulse rounded-xl bg-muted" />
        <div className="h-40 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="container flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
        <h1 className="text-2xl font-semibold">Không thể mở đơn hàng</h1>
        <p role="alert" className="mt-2 text-sm text-muted-foreground">{error || 'Không tìm thấy đơn hàng.'}</p>
        <Button asChild className="mt-5"><Link to="/profile">Về tài khoản</Link></Button>
      </div>
    );
  }

  const status = order.orderStatus || order.status;
  const statusLabel = String(status || 'PENDING').replace(/_/g, ' ');
  const isPendingVietQrPayment = order.paymentMethod === 'VIETQR'
    && !order.isPaid
    && order.payment?.status === 'PENDING'
    && status !== 'CANCELLED';
  const paymentInstructions = order.paymentInstructions;

  const refreshOrderStatus = async () => {
    try {
      const updatedOrder = await orderService.getOrderById(Number(id));
      setOrder(updatedOrder);
      setPaymentRefreshError('');
      toast({
        title: updatedOrder.isPaid ? 'Đã xác nhận thanh toán' : 'Đơn vẫn đang chờ thanh toán',
        description: updatedOrder.isPaid
          ? 'Admin đã cập nhật trạng thái thanh toán.'
          : 'Sau khi chuyển khoản, admin sẽ đối soát giao dịch ngân hàng và cập nhật trạng thái đơn.'
      });
    } catch (requestError) {
      const message = getApiErrorMessage(requestError, 'Không thể cập nhật trạng thái đơn hàng.');
      setPaymentRefreshError(message);
      toast({ title: 'Không thể làm mới đơn hàng', description: message, variant: 'destructive' });
    }
  };

  return (
    <div className="container min-h-[65vh] py-8 md:py-12">
      <Link to="/profile" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Lịch sử đơn hàng
      </Link>
      <header className="mb-8 flex flex-col justify-between gap-3 border-b pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Chi tiết đơn hàng</p>
          <h1 className="mt-2 text-2xl font-semibold">#{order.orderNumber || order.id}</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Đặt ngày {new Date(order.createdAt).toLocaleDateString('vi-VN')}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-6">
          <div className="rounded-xl border bg-white p-5 sm:p-6">
            <h2 className="mb-4 font-semibold">Sản phẩm</h2>
            <div className="divide-y">
              {order.orderItems?.map((item) => (
                <div key={item.id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                  <img
                    src={item.productImage || item.product?.image || '/placeholder.svg'}
                    alt={item.productName || item.product?.name || 'Sản phẩm'}
                    className="h-16 w-14 rounded-md bg-muted object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.productName || item.product?.name || 'Sản phẩm'}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Số lượng: {item.quantity}</p>
                  </div>
                  <p className="whitespace-nowrap text-sm font-medium">{currency(item.price * item.quantity)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border bg-white p-5 sm:p-6">
            <h2 className="mb-4 font-semibold">Giao hàng</h2>
            <p className="text-sm leading-6 text-muted-foreground">{getAddressText(order.shippingAddress)}</p>
          </div>
        </section>

        <aside className="h-fit rounded-xl border bg-white p-5 sm:p-6">
          <h2 className="mb-4 font-semibold">Trạng thái</h2>
          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-muted-foreground"><Package className="h-4 w-4" /> Đơn hàng</span>
              <span className="font-medium">{statusLabel}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-muted-foreground"><PackageCheck className="h-4 w-4" /> Thanh toán</span>
              <span className="font-medium">{order.payment?.status || (order.isPaid ? 'PAID' : 'PENDING')}</span>
            </div>
            {shouldPollPayment && (
              <p className="text-xs text-muted-foreground">
                Trang tự làm mới trạng thái đơn hàng; thanh toán chỉ được ghi nhận sau khi giao dịch được xác nhận.
              </p>
            )}
            {paymentRefreshError && (
              <p role="alert" className="text-xs text-destructive">{paymentRefreshError}</p>
            )}
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-muted-foreground"><Truck className="h-4 w-4" /> Phương thức</span>
              <span className="font-medium">{order.paymentMethod}</span>
            </div>
            {isPendingVietQrPayment && (
              <div className="space-y-3 border-t pt-4">
                {!showPaymentDetails ? (
                  <Button className="w-full" onClick={() => setShowPaymentDetails(true)}>
                    Tiếp tục thanh toán
                  </Button>
                ) : (
                  <div className="space-y-3 rounded-lg border p-3">
                    <div className="flex items-start gap-2 rounded-md bg-amber-50 p-3 text-xs text-amber-900">
                      <Info className="mt-0.5 h-4 w-4 shrink-0" />
                      <p>Chuyển đúng số tiền và giữ nguyên nội dung. Đơn chỉ được đánh dấu đã thanh toán sau khi admin xác nhận tiền đã vào tài khoản.</p>
                    </div>
                    {paymentInstructions?.qrImageUrl && !paymentInstructions.demoMode && (
                      <div className="flex justify-center rounded-md bg-white p-3">
                        <img
                          src={paymentInstructions.qrImageUrl}
                          alt="Mã QR thanh toán VietQR"
                          className="h-52 w-52 object-contain"
                        />
                      </div>
                    )}
                    {paymentInstructions?.demoMode && (
                      <p role="alert" className="rounded-md bg-amber-50 p-3 text-xs text-amber-900">
                        Đơn này được tạo trong chế độ demo; không có QR nhận tiền thật.
                      </p>
                    )}
                    <div className="space-y-2 text-sm">
                      {paymentInstructions?.bankId && (
                        <p className="flex justify-between gap-3"><span className="text-muted-foreground">Ngân hàng</span><span className="text-right font-medium">{paymentInstructions.bankId}</span></p>
                      )}
                      {paymentInstructions?.accountNumber && (
                        <p className="flex justify-between gap-3"><span className="text-muted-foreground">Tài khoản</span><span className="text-right font-medium">{paymentInstructions.accountName} · {paymentInstructions.accountNumber}</span></p>
                      )}
                      <p className="flex justify-between gap-3"><span className="text-muted-foreground">Số tiền</span><span className="font-semibold">{currency(Number(paymentInstructions?.amount ?? order.payment?.amount ?? order.totalPrice))}</span></p>
                      <p className="flex justify-between gap-3"><span className="text-muted-foreground">Nội dung chuyển khoản</span><span className="break-all text-right font-mono font-medium">{paymentInstructions?.reference || order.payment?.paymentReference}</span></p>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <Button className="w-full whitespace-normal text-center leading-tight" variant="outline" onClick={() => setShowPaymentDetails(false)}>
                        Đóng mã QR
                      </Button>
                      <Button className="w-full whitespace-normal text-center leading-tight" onClick={() => void refreshOrderStatus()}>
                        Kiểm tra trạng thái
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="my-5 border-t" />
          <div className="space-y-3 text-sm">
            <div className="flex justify-between gap-3"><span className="text-muted-foreground">Tạm tính</span><span>{currency(order.totalPrice - order.shippingPrice + (order.discountPrice || 0))}</span></div>
            {Number(order.discountPrice) > 0 && (
              <div className="flex justify-between gap-3"><span className="text-muted-foreground">Giảm giá</span><span>-{currency(Number(order.discountPrice))}</span></div>
            )}
            <div className="flex justify-between gap-3"><span className="text-muted-foreground">Giao hàng</span><span>{currency(order.shippingPrice)}</span></div>
            <div className="flex justify-between gap-3 border-t pt-3 font-semibold"><span>Tổng cộng</span><span>{currency(order.totalPrice)}</span></div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default OrderDetail;
