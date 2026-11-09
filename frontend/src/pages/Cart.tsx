import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAllContexts } from '@/hooks/useAllContexts';

const currency = (amount: number) => new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0
}).format(amount);

const Cart = () => {
  const { cart, updateQuantity, removeFromCart, clearCart, getCartTotal, isCartLoading, cartError } = useAllContexts();
  const navigate = useNavigate();
  const [voucher, setVoucher] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState('');
  const [voucherError, setVoucherError] = useState('');

  const subtotal = getCartTotal();
  const estimatedShipping = subtotal >= 500000 ? 0 : 30000;

  const applyVoucher = (event: React.FormEvent) => {
    event.preventDefault();
    const code = voucher.trim();
    if (!code) {
      setVoucherError('Nhập mã voucher trước khi áp dụng.');
      return;
    }
    setAppliedVoucher(code);
    setVoucherError('');
  };

  const goToCheckout = () => {
    navigate('/checkout', { state: { voucherCode: appliedVoucher || undefined } });
  };

  if (cartError) {
    return (
      <div className="container flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
        <h1 className="text-2xl font-semibold">Không thể tải giỏ hàng</h1>
        <p role="alert" className="mt-2 max-w-md text-sm text-destructive">{cartError}</p>
        <Button type="button" className="mt-6" onClick={() => window.location.reload()}>
          Thử lại
        </Button>
      </div>
    );
  }

  if (!cart.length) {
    return (
      <div className="container flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
        <div className="mb-5 rounded-full bg-muted p-5"><ShoppingBag className="h-8 w-8 text-muted-foreground" /></div>
        <h1 className="text-2xl font-semibold">Giỏ hàng đang trống</h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">Khám phá sản phẩm và thêm lựa chọn yêu thích vào giỏ hàng.</p>
        <Button asChild className="mt-6"><Link to="/products">Tiếp tục mua sắm</Link></Button>
      </div>
    );
  }

  return (
    <div className="container py-8 md:py-12">
      <Link to="/products" className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Tiếp tục mua sắm
      </Link>
      <div className="mb-8 flex items-end justify-between border-b pb-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">YAMI</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Giỏ hàng</h1>
        </div>
        <span className="text-sm text-muted-foreground">{cart.reduce((sum, item) => sum + item.quantity, 0)} sản phẩm</span>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="divide-y rounded-xl border bg-white px-4 sm:px-6">
          {cart.map((item) => {
            const price = Number(item.product.salePrice ?? item.product.price);
            const variantId = item.variantId ?? item.variationId;
            return (
              <article key={`${item.productId}-${variantId || ''}`} className="flex gap-4 py-5 sm:gap-6">
                <Link to={`/products/${item.productId}`} className="h-24 w-20 shrink-0 overflow-hidden rounded-lg bg-muted sm:h-32 sm:w-28">
                  <img src={item.product.image || '/placeholder.svg'} alt={item.product.name} className="h-full w-full object-cover" />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col justify-between gap-3 sm:flex-row">
                  <div className="min-w-0">
                    <Link to={`/products/${item.productId}`} className="font-medium hover:underline">{item.product.name}</Link>
                    <p className="mt-1 text-sm text-muted-foreground">{item.product.category?.name || 'Sản phẩm'}</p>
                    {item.variant && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Màu {item.variant.color} · Size {item.variant.size}
                      </p>
                    )}
                    <p className="mt-2 text-sm">{currency(price)} / sản phẩm</p>
                  </div>
                  <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end sm:justify-between">
                    <span className="font-semibold">{currency(price * item.quantity)}</span>
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 items-center rounded-md border">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          aria-label="Giảm số lượng"
                          className="h-8 w-8"
                          disabled={isCartLoading || item.quantity <= 1}
                          onClick={() => void updateQuantity(item.productId, item.quantity - 1, variantId)}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <span className="w-8 text-center text-sm">{item.quantity}</span>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          aria-label="Tăng số lượng"
                          className="h-8 w-8"
                          disabled={isCartLoading || item.quantity >= Number(item.variant?.stock ?? item.product.countInStock ?? 999)}
                          onClick={() => void updateQuantity(item.productId, item.quantity + 1, variantId)}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label={`Xóa ${item.product.name}`}
                        className="h-9 w-9 text-muted-foreground hover:text-destructive"
                        onClick={() => removeFromCart(item.productId, variantId)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
          <div className="flex justify-end py-4">
            <Button type="button" variant="ghost" size="sm" onClick={clearCart}>Xóa toàn bộ giỏ hàng</Button>
          </div>
        </section>

        <aside className="h-fit rounded-xl border p-5 sm:p-6">
          <h2 className="text-lg font-semibold">Tóm tắt đơn hàng</h2>
          <form onSubmit={applyVoucher} className="mt-5 space-y-2">
            <label htmlFor="cart-voucher" className="text-sm font-medium">Mã voucher</label>
            <div className="flex gap-2">
              <Input
                id="cart-voucher"
                value={voucher}
                onChange={(event) => setVoucher(event.target.value)}
                placeholder="Nhập mã"
                maxLength={64}
              />
              <Button type="submit" variant="outline">Áp dụng</Button>
            </div>
            {voucherError && <p role="alert" className="text-sm text-destructive">{voucherError}</p>}
            {appliedVoucher && (
              <p className="text-sm text-muted-foreground">
                Đã thêm mã {appliedVoucher}. Backend sẽ kiểm tra tính hợp lệ và tính giảm giá tại checkout.
              </p>
            )}
          </form>

          <div className="mt-6 space-y-3 border-t pt-5 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Tạm tính</span><span>{currency(subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Phí giao hàng ước tính</span><span>{estimatedShipping ? currency(estimatedShipping) : 'Miễn phí'}</span></div>
            <div className="flex justify-between border-t pt-4 text-base font-semibold">
              <span>Tạm tính thanh toán</span><span>{currency(subtotal + estimatedShipping)}</span>
            </div>
          </div>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            Giá, tồn kho, voucher và tổng thanh toán sẽ được kiểm tra lại tại backend khi tạo đơn.
          </p>
          <Button className="mt-5 w-full" size="lg" onClick={goToCheckout}>Tiến hành thanh toán</Button>
        </aside>
      </div>
    </div>
  );
};

export default Cart;
