import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAllContexts } from "@/hooks/useAllContexts";
import { User, MapPin, Mail, Phone, Info } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { orderService } from "@/services/orderService";
import { Order } from "@/types";
import { getApiErrorMessage } from "@/lib/apiError";
import { PaymentMethod, paymentService } from "@/services/paymentService";
import AddressSearchSelect from "@/components/AddressSearchSelect";
import { vietnamAddressService, VietnamProvince, VietnamWard } from "@/services/vietnamAddressService";
import {
  getAddressError,
  getEmailError,
  getNameError,
  getPhoneError,
  sanitizeNameInput
} from "@/lib/accountValidation";

type CheckoutFormData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

type CheckoutField = keyof CheckoutFormData;

const hasControlCharacters = (value: string) => Array.from(value).some((character) => {
  const code = character.charCodeAt(0);
  return code < 32 || code === 127;
});

const checkoutFields: CheckoutField[] = [
  'firstName', 'lastName', 'email', 'phone', 'address',
  'city', 'state', 'postalCode', 'country'
];

const validateCheckoutData = (data: CheckoutFormData) => {
  const errors: Partial<Record<CheckoutField, string>> = {};
  const checkText = (field: CheckoutField, label: string, required: boolean) => {
    const value = data[field].trim();
    if (required && !value) {
      errors[field] = `Vui lòng nhập ${label}.`;
    } else if (value.length > 255) {
      errors[field] = `${label} không được vượt quá 255 ký tự.`;
    } else if (hasControlCharacters(value)) {
      errors[field] = `${label} chứa ký tự không hợp lệ.`;
    }
  };

  errors.firstName = getNameError(data.firstName) || undefined;
  errors.lastName = getNameError(data.lastName) || undefined;
  errors.email = getEmailError(data.email) || undefined;
  errors.phone = !data.phone.trim()
    ? 'Vui lòng nhập số điện thoại.'
    : getPhoneError(data.phone) || undefined;
  errors.address = getAddressError(data.address) || undefined;
  if (!data.address.trim()) errors.address = 'Vui lòng nhập Địa chỉ.';
  checkText('city', 'Tỉnh/thành phố', true);
  checkText('state', 'Phường/xã', data.country === 'Vietnam');
  checkText('postalCode', 'Mã bưu chính', false);
  if (!['Vietnam', 'United States', 'Canada', 'United Kingdom', 'Australia'].includes(data.country)) {
    errors.country = 'Quốc gia không hợp lệ.';
  }
  return errors;
};

const Checkout = () => {
  const { cart, clearCart, user } = useAllContexts();
  const idempotencyKey = useRef(crypto.randomUUID());
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [orderTotal, setOrderTotal] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('COD');
  const [availablePaymentMethods, setAvailablePaymentMethods] = useState<PaymentMethod[]>(['COD']);
  const [vietQrDemoMode, setVietQrDemoMode] = useState(false);
  const [vietQrManualConfirmation, setVietQrManualConfirmation] = useState(false);
  const [demoPaymentLoading, setDemoPaymentLoading] = useState(false);
  const [voucherCode, setVoucherCode] = useState('');
  const [paymentInstructions, setPaymentInstructions] = useState<Order['paymentInstructions']>();
  const [provinces, setProvinces] = useState<VietnamProvince[]>([]);
  const [wards, setWards] = useState<VietnamWard[]>([]);
  const [loadingProvinces, setLoadingProvinces] = useState(true);
  const [loadingWards, setLoadingWards] = useState(false);
  const [addressLookupError, setAddressLookupError] = useState('');
  const [addressRetry, setAddressRetry] = useState(0);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    postalCode: "",
    country: "Vietnam",
  });
  const [touchedFields, setTouchedFields] = useState<Set<CheckoutField>>(() => new Set());
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const isNameComposing = useRef(false);
  const validationErrors = validateCheckoutData(formData);
  const getFieldError = (field: CheckoutField) =>
    showValidationErrors || touchedFields.has(field) ? validationErrors[field] : undefined;
  const markFieldTouched = (field: CheckoutField) =>
    setTouchedFields((current) => new Set(current).add(field));
  const selectedProvinceCode = provinces.find((province) => province.name === formData.city)?.code;

  useEffect(() => {
    let active = true;
    paymentService.getAvailableMethods()
      .then(({ methods, vietQrDemoMode: isDemoMode, vietQrManualConfirmation: manualConfirmation }) => {
        if (!active) return;
        const availableMethods: PaymentMethod[] = methods.includes('COD') ? methods : [...methods, 'COD'];
        setVietQrDemoMode(isDemoMode);
        setVietQrManualConfirmation(manualConfirmation);
        setAvailablePaymentMethods(availableMethods);
        setPaymentMethod((current) => availableMethods.includes(current)
          ? current
          : availableMethods.includes('VIETQR') ? 'VIETQR' : 'COD');
      })
      .catch((error) => {
        if (!active) return;
        toast({
          title: 'Không thể tải phương thức thanh toán',
          description: getApiErrorMessage(error, 'Tạm thời chỉ hiển thị thanh toán khi nhận hàng.'),
          variant: 'destructive'
        });
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoadingProvinces(true);
    setAddressLookupError('');
    vietnamAddressService.getProvinces(controller.signal)
      .then(setProvinces)
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setAddressLookupError(error instanceof Error ? error.message : 'Không thể tải danh sách tỉnh/thành.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingProvinces(false);
      });
    return () => controller.abort();
  }, [addressRetry]);

  useEffect(() => {
    if (!selectedProvinceCode) {
      setWards([]);
      return;
    }

    const controller = new AbortController();
    setLoadingWards(true);
    setAddressLookupError('');
    vietnamAddressService.getWards(selectedProvinceCode, controller.signal)
      .then(setWards)
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setAddressLookupError(error instanceof Error ? error.message : 'Không thể tải danh sách phường/xã.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingWards(false);
      });
    return () => controller.abort();
  }, [addressRetry, selectedProvinceCode]);
  
  useEffect(() => {
    if (user?.email) {
      setFormData((current) => ({ ...current, email: current.email || user.email }));
    }
    const initialVoucher = location.state?.voucherCode;
    if (typeof initialVoucher === 'string') setVoucherCode(initialVoucher);
    const reorder = location.state?.reorder;
    if (!reorder) return;

    const rawAddress = typeof reorder.shippingAddress === 'string'
      ? reorder.shippingAddress
      : '';
    const [, recipient = '', phone = '', address = rawAddress] =
      rawAddress.match(/^([^;]+);\s*([^;]+);\s*(.*)$/) || [];
    const addressParts = address.split(',').map((part: string) => part.trim()).filter(Boolean);
    const recipientParts = recipient.trim().split(/\s+/).filter(Boolean);
    setFormData((current) => ({
      ...current,
      firstName: recipientParts[0] || current.firstName,
      lastName: recipientParts.slice(1).join(' ') || current.lastName,
      phone: phone || current.phone,
      address: addressParts[0] || current.address,
      city: addressParts[1] || current.city,
      state: addressParts[2] || current.state
    }));
    if (reorder.paymentMethod === 'COD' || reorder.paymentMethod === 'VIETQR') {
      setPaymentMethod(reorder.paymentMethod);
    }
  }, [location.state, user?.email]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: (name === 'firstName' || name === 'lastName') && !isNameComposing.current
        ? sanitizeNameInput(value)
        : value
    }));
  };

  const handleNameCompositionEnd = (e: React.CompositionEvent<HTMLInputElement>) => {
    isNameComposing.current = false;
    const name = e.currentTarget.name as 'firstName' | 'lastName';
    const value = sanitizeNameInput(e.currentTarget.value);
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowValidationErrors(true);
    setTouchedFields(new Set(checkoutFields));
    const errors = validateCheckoutData(formData);
    const firstInvalidField = checkoutFields.find((field) => errors[field]);
    if (firstInvalidField) {
      const fieldLabel = firstInvalidField === 'city'
        ? 'Tỉnh/thành'
        : firstInvalidField === 'state' ? 'Phường/xã' : undefined;
      const invalidElement = document.getElementById(firstInvalidField)
        || (fieldLabel ? document.querySelector(`[aria-label="${fieldLabel}"]`) : null);
      if (invalidElement instanceof HTMLElement) invalidElement.focus();
      toast({
        title: 'Vui lòng kiểm tra lại thông tin',
        description: errors[firstInvalidField],
        variant: 'destructive'
      });
      return;
    }
    if (formData.country === 'Vietnam' && (!selectedProvinceCode || !formData.state)) {
      toast({
        title: 'Vui lòng chọn địa chỉ giao hàng',
        description: 'Chọn tỉnh/thành và phường/xã từ danh sách địa chỉ.',
        variant: 'destructive'
      });
      return;
    }
    if (!availablePaymentMethods.includes(paymentMethod)) {
      toast({
        title: 'Phương thức thanh toán chưa sẵn sàng',
        description: 'Vui lòng chọn thanh toán khi nhận hàng hoặc cấu hình tài khoản VietQR của cửa hàng.',
        variant: 'destructive'
      });
      return;
    }
    setLoading(true);
    try {
      // Call backend to create order using orderService
      const data = await orderService.createOrder({
        ...formData,
        paymentMethod,
        voucherCode: voucherCode.trim() || undefined,
        cart,
      }, idempotencyKey.current);
      setOrderId(data.id.toString());
      setOrderNumber(data.orderNumber || data.id.toString());
      setOrderTotal(Number(data.totalPrice));
      setPaymentInstructions(data.paymentInstructions);
      clearCart();
      setShowQR(true);
      toast({
        title: paymentMethod === 'COD'
          ? 'Đã tạo đơn, thanh toán khi nhận hàng.'
          : data.paymentInstructions?.demoMode
            ? 'Đã tạo đơn demo. Hãy chọn mô phỏng thanh toán.'
            : 'Đã tạo đơn. Quét mã VietQR để thanh toán.',
      });
    } catch (err) {
      toast({
        title: 'Order failed',
        description: getApiErrorMessage(err, 'Không thể tạo đơn hàng. Vui lòng thử lại.'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCheckPayment = async () => {
    if (!orderId) return;

    try {
      const order = await orderService.getOrderById(Number(orderId));
      if (!order.isPaid) {
        toast({
          title: paymentMethod === 'COD' ? 'Payment due on delivery' : 'Đang chờ ngân hàng xác nhận',
          description: paymentMethod === 'COD'
            ? 'The courier collects payment on delivery. An administrator records the receipt after delivery.'
            : vietQrManualConfirmation
              ? 'Nếu đã chuyển đúng số tiền và nội dung, đơn sẽ được cập nhật sau khi admin đối soát giao dịch trong tài khoản ngân hàng.'
              : 'Nếu đã chuyển khoản đúng số tiền và nội dung, trạng thái sẽ tự cập nhật sau khi SePay gửi thông báo giao dịch.',
          duration: 5000,
        });
        return;
      }

      toast({
        title: 'Payment confirmed',
        description: `Đã nhận xác nhận thanh toán cho đơn ${orderNumber || orderId}.`,
        duration: 3000,
      });
      setShowQR(false);
      navigate('/order-confirmation', {
        state: {
          orderId,
          orderNumber: orderNumber || orderId,
          isPaid: true,
          paymentMethod
        }
      });
    } catch (error) {
      toast({
        title: 'Could not refresh order status',
        description: getApiErrorMessage(error, 'Vui lòng thử lại.'),
        variant: 'destructive',
      });
    }
  };

  const handleDemoPayment = async () => {
    if (!orderId) return;
    setDemoPaymentLoading(true);
    try {
      await orderService.simulateDemoPayment(Number(orderId));
      toast({
        title: 'Đã mô phỏng thanh toán thành công',
        description: 'Đây chỉ là giao dịch demo, không có tiền thật được chuyển.',
        duration: 4000
      });
      setShowQR(false);
      navigate('/order-confirmation', {
        state: {
          orderId,
          orderNumber: orderNumber || orderId,
          isPaid: true,
          paymentMethod: 'VIETQR'
        }
      });
    } catch (error) {
      toast({
        title: 'Không thể mô phỏng thanh toán',
        description: getApiErrorMessage(error, 'Vui lòng tải lại trạng thái đơn hàng và thử lại.'),
        variant: 'destructive'
      });
    } finally {
      setDemoPaymentLoading(false);
    }
  };

  const subtotal = cart.reduce((sum, item) =>
    sum + Number(item.product.salePrice ?? item.product.price) * item.quantity, 0);
  const shipping = subtotal >= 500000 ? 0 : 30000;
  const total = subtotal + shipping;

  const qrAmount = orderTotal || total;
  const qrUrl = paymentInstructions?.qrImageUrl;

  if (cart.length === 0 && !orderId) {
    return (
      <div className="container flex min-h-[65vh] flex-col items-center justify-center py-16 text-center">
        <h1 className="text-2xl font-semibold">Giỏ hàng đang trống</h1>
        <p className="mt-2 text-sm text-muted-foreground">Thêm sản phẩm vào giỏ hàng trước khi thanh toán.</p>
        <Button className="mt-5" onClick={() => navigate('/products')}>Khám phá sản phẩm</Button>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-8 md:py-12">
      <header className="mb-8 border-b pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">YAMI checkout</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Thanh toán</h1>
        <p className="mt-2 text-sm text-muted-foreground">Kiểm tra thông tin nhận hàng và phương thức thanh toán trước khi đặt đơn.</p>
      </header>
      <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Customer Information */}
        <div className="space-y-8">
          <div className="rounded-xl border bg-white p-5 sm:p-6">
            <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold">
              <User className="h-5 w-5 text-muted-foreground" />
              Thông tin người nhận
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="firstName" className="flex items-center gap-1 text-sm font-medium">
                  <User className="h-4 w-4" />
                  Tên
                </label>
                <input 
                  type="text" 
                  id="firstName" 
                  name="firstName" 
                  className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" 
                  required 
                  value={formData.firstName} 
                  onChange={handleChange} 
                  onBlur={() => markFieldTouched('firstName')}
                  onCompositionStart={() => { isNameComposing.current = true; }}
                  onCompositionEnd={handleNameCompositionEnd}
                  maxLength={255}
                  aria-invalid={Boolean(getFieldError('firstName'))}
                  aria-describedby={getFieldError('firstName') ? 'firstName-error' : undefined}
                />
                {getFieldError('firstName') && <p id="firstName-error" role="alert" className="mt-1 text-xs text-destructive">{getFieldError('firstName')}</p>}
              </div>
              <div>
                <label htmlFor="lastName" className="flex items-center gap-1 text-sm font-medium">
                  <User className="h-4 w-4" />
                  Họ
                </label>
                <input 
                  type="text" 
                  id="lastName" 
                  name="lastName" 
                  className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" 
                  required 
                  value={formData.lastName} 
                  onChange={handleChange} 
                  onBlur={() => markFieldTouched('lastName')}
                  onCompositionStart={() => { isNameComposing.current = true; }}
                  onCompositionEnd={handleNameCompositionEnd}
                  maxLength={255}
                  aria-invalid={Boolean(getFieldError('lastName'))}
                  aria-describedby={getFieldError('lastName') ? 'lastName-error' : undefined}
                />
                {getFieldError('lastName') && <p id="lastName-error" role="alert" className="mt-1 text-xs text-destructive">{getFieldError('lastName')}</p>}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="email" className="flex items-center gap-1 text-sm font-medium">
                  <Mail className="h-4 w-4" />
                  Email
                </label>
                <input 
                  type="email" 
                  id="email" 
                  name="email" 
                  className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" 
                  required 
                  value={formData.email} 
                  onChange={handleChange} 
                  onBlur={() => markFieldTouched('email')}
                  maxLength={254}
                  aria-invalid={Boolean(getFieldError('email'))}
                  aria-describedby={getFieldError('email') ? 'email-error' : undefined}
                />
                {getFieldError('email') && <p id="email-error" role="alert" className="mt-1 text-xs text-destructive">{getFieldError('email')}</p>}
              </div>
              <div>
                <label htmlFor="phone" className="flex items-center gap-1 text-sm font-medium">
                  <Phone className="h-4 w-4" />
                  Điện thoại
                </label>
                <input 
                  type="tel" 
                  id="phone" 
                  name="phone" 
                  className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" 
                  required 
                  value={formData.phone} 
                  onChange={handleChange} 
                  onBlur={() => markFieldTouched('phone')}
                  maxLength={32}
                  inputMode="tel"
                  aria-invalid={Boolean(getFieldError('phone'))}
                  aria-describedby={getFieldError('phone') ? 'phone-error' : undefined}
                />
                {getFieldError('phone') && <p id="phone-error" role="alert" className="mt-1 text-xs text-destructive">{getFieldError('phone')}</p>}
              </div>
            </div>
          </div>
          <div className="rounded-xl border bg-white p-5 sm:p-6">
            <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              Địa chỉ giao hàng
            </h2>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label htmlFor="address" className="block text-sm font-medium">Địa chỉ</label>
                <input 
                  type="text" 
                  id="address" 
                  name="address" 
                  className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" 
                  required 
                  value={formData.address} 
                  onChange={handleChange} 
                  onBlur={() => markFieldTouched('address')}
                  maxLength={255}
                  aria-invalid={Boolean(getFieldError('address'))}
                  aria-describedby={getFieldError('address') ? 'address-error' : undefined}
                />
                {getFieldError('address') && <p id="address-error" role="alert" className="mt-1 text-xs text-destructive">{getFieldError('address')}</p>}
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium">Tỉnh / thành phố</label>
                  {formData.country === 'Vietnam' ? (
                    <AddressSearchSelect
                      label="Tỉnh/thành"
                      value={formData.city}
                      options={provinces.map((province) => province.name)}
                      placeholder={loadingProvinces ? 'Đang tải danh sách...' : 'Chọn tỉnh/thành'}
                      disabled={loadingProvinces}
                      invalid={Boolean(getFieldError('city'))}
                      onChange={(city) => {
                        setFormData((current) => ({ ...current, city, state: '' }));
                        markFieldTouched('city');
                        markFieldTouched('state');
                      }}
                    />
                  ) : (
                    <input
                      type="text"
                      id="city"
                      name="city"
                      className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      required
                      value={formData.city}
                      onChange={handleChange}
                      onBlur={() => markFieldTouched('city')}
                      maxLength={255}
                      aria-invalid={Boolean(getFieldError('city'))}
                    />
                  )}
                  {getFieldError('city') && <p id="city-error" role="alert" className="mt-1 text-xs text-destructive">{getFieldError('city')}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium">Phường / xã</label>
                  {formData.country === 'Vietnam' ? (
                    <AddressSearchSelect
                      label="Phường/xã"
                      value={formData.state}
                      options={wards.map((ward) => ward.name)}
                      placeholder={loadingWards ? 'Đang tải danh sách...' : 'Chọn phường/xã'}
                      disabled={!selectedProvinceCode || loadingWards || Boolean(addressLookupError)}
                      invalid={Boolean(getFieldError('state'))}
                      onChange={(state) => {
                        setFormData((current) => ({
                          ...current,
                          state,
                          postalCode: wards.find((ward) => ward.name === state)?.postalCode || ''
                        }));
                        markFieldTouched('state');
                      }}
                    />
                  ) : (
                    <input
                      type="text"
                      id="state"
                      name="state"
                      className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      value={formData.state}
                      onChange={handleChange}
                      onBlur={() => markFieldTouched('state')}
                      maxLength={255}
                      aria-invalid={Boolean(getFieldError('state'))}
                    />
                  )}
                  {getFieldError('state') && <p id="state-error" role="alert" className="mt-1 text-xs text-destructive">{getFieldError('state')}</p>}
                </div>
              </div>
              {addressLookupError && formData.country === 'Vietnam' && (
                <div role="alert" className="flex items-center justify-between gap-3 text-sm text-destructive">
                  <p>{addressLookupError}</p>
                  <Button type="button" variant="outline" size="sm" onClick={() => setAddressRetry((current) => current + 1)}>
                    Thử tải lại
                  </Button>
                </div>
              )}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="postalCode" className="block text-sm font-medium">Mã bưu chính</label>
                  {formData.country === 'Vietnam' ? (
                    <>
                      <input
                        type="text"
                        id="postalCode"
                        name="postalCode"
                        readOnly
                        className="mt-1 h-10 w-full rounded-md border bg-muted px-3 text-sm"
                        value={formData.postalCode}
                        placeholder="Tự động điền khi chọn phường/xã"
                        aria-invalid={Boolean(getFieldError('postalCode'))}
                      />
                      <p className="mt-1 text-xs text-muted-foreground">Mã bưu chính được tự động lấy theo phường/xã.</p>
                    </>
                  ) : (
                    <input
                      type="text"
                      id="postalCode"
                      name="postalCode"
                      className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      value={formData.postalCode}
                      onChange={handleChange}
                      onBlur={() => markFieldTouched('postalCode')}
                      maxLength={32}
                      aria-invalid={Boolean(getFieldError('postalCode'))}
                    />
                  )}
                  {getFieldError('postalCode') && <p id="postalCode-error" role="alert" className="mt-1 text-xs text-destructive">{getFieldError('postalCode')}</p>}
                </div>
                <div>
                  <label htmlFor="country" className="block text-sm font-medium">Quốc gia</label>
                  <select 
                    id="country" 
                    name="country" 
                    className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" 
                    required 
                    value={formData.country} 
                    onChange={(e) => setFormData((current) => ({
                      ...current,
                      country: e.target.value,
                      city: '',
                      state: ''
                    }))}
                    onBlur={() => markFieldTouched('country')}
                    aria-invalid={Boolean(getFieldError('country'))}
                  >
                    <option value="Vietnam">Vietnam</option>
                    <option value="United States">United States</option>
                    <option value="Canada">Canada</option>
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="Australia">Australia</option>
                  </select>
                  {getFieldError('country') && <p id="country-error" role="alert" className="mt-1 text-xs text-destructive">{getFieldError('country')}</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Order Summary */}
        <div>
          <div className="sticky top-24 h-fit rounded-xl border bg-white p-5 sm:p-6">
            <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold">
              <Info className="h-5 w-5 text-muted-foreground" />
              Tóm tắt đơn hàng
            </h2>
            <div className="space-y-6">
              {cart.map((item) => {
                return (
                  <div key={`${item.productId}-${item.variantId ?? item.variationId ?? ''}`} className="flex items-center gap-3">
                    <div className="h-14 w-12 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                      <img src={item.product.image || '/placeholder.svg'} alt={item.product.name} className="h-full w-full object-cover object-center" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between gap-3 text-sm font-medium">
                        <h3>{item.product.name}</h3>
                        <p className="whitespace-nowrap">{(Number(item.product.salePrice ?? item.product.price) * item.quantity).toLocaleString('vi-VN')} ₫</p>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">Số lượng: {item.quantity}</p>
                    </div>
                  </div>
                );
              })}
              <Separator />
              <div className="flex items-center justify-between text-sm">
                <p className="text-muted-foreground">Tạm tính</p>
                <p className="font-medium">{subtotal.toLocaleString('vi-VN')} ₫</p>
              </div>
              <div className="flex items-center justify-between text-sm">
                <p className="text-muted-foreground">Giao hàng ước tính</p>
                <p className="font-medium">{shipping === 0 ? 'Miễn phí' : `${shipping.toLocaleString('vi-VN')} ₫`}</p>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <p className="font-semibold">Tổng ước tính</p>
                <p className="text-xl font-semibold">{(orderTotal || total).toLocaleString('vi-VN')} ₫</p>
              </div>
              <p className="text-xs leading-5 text-muted-foreground">
                {orderTotal
                  ? 'Tổng tiền chính thức do backend tính khi tạo đơn.'
                  : 'Tổng tiền cuối cùng được backend tính lại từ giá và tồn kho hiện tại.'}
              </p>
              <div className="space-y-2">
                <label htmlFor="paymentMethod" className="text-sm font-medium">Phương thức thanh toán</label>
                <select
                  id="paymentMethod"
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value as 'COD' | 'VIETQR')}
                  disabled={availablePaymentMethods.length === 1}
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {availablePaymentMethods.includes('VIETQR') && (
                    <option value="VIETQR">
                      {vietQrDemoMode
                        ? 'VietQR · Mô phỏng (không nhận tiền thật)'
                        : vietQrManualConfirmation
                          ? 'VietQR · Admin xác nhận thủ công'
                          : 'VietQR · Tự động xác nhận'}
                    </option>
                  )}
                  {availablePaymentMethods.includes('COD') && <option value="COD">Thanh toán khi nhận hàng</option>}
                </select>
                {vietQrDemoMode && availablePaymentMethods.includes('VIETQR') && (
                  <p className="text-xs leading-5 text-amber-700">
                    Chế độ demo: không tạo mã QR chuyển khoản và không nhận tiền thật.
                  </p>
                )}
                {vietQrManualConfirmation && availablePaymentMethods.includes('VIETQR') && (
                  <p className="text-xs leading-5 text-muted-foreground">
                    QR sẽ điền sẵn số tiền và nội dung chuyển khoản. Đơn chỉ được xác nhận sau khi admin kiểm tra tài khoản ngân hàng.
                  </p>
                )}
                {!availablePaymentMethods.includes('VIETQR') && (
                  <p className="text-xs leading-5 text-muted-foreground">
                    VietQR chỉ hiển thị khi cửa hàng đã cấu hình tài khoản nhận tiền và webhook SePay để tự động xác nhận. Hiện bạn có thể thanh toán khi nhận hàng.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label htmlFor="voucherCode" className="text-sm font-medium">Mã voucher (không bắt buộc)</label>
                <input
                  id="voucherCode"
                  value={voucherCode}
                  onChange={(event) => setVoucherCode(event.target.value)}
                  maxLength={64}
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Nhập mã voucher"
                />
              </div>
            </div>
            <Button 
              type="submit" 
              className="mt-6 w-full" 
              size="lg" 
              disabled={loading}
            >
              {loading ? 'Đang tạo đơn...' : paymentMethod === 'COD' ? 'Đặt hàng · thanh toán khi nhận' : 'Đặt hàng với VietQR'}
            </Button>
            <p className="mt-3 text-center text-xs leading-5 text-muted-foreground">
              Mã voucher, giá, tồn kho, phí vận chuyển và tổng thanh toán được xác thực lại ở backend.
            </p>
          </div>
        </div>
      </form>
      {/* QR Modal */}
      <Dialog
        open={showQR}
        onOpenChange={setShowQR}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-semibold">
              {paymentMethod === 'COD'
                ? 'Thanh toán khi nhận hàng'
                : paymentInstructions?.demoMode ? 'Mô phỏng thanh toán VietQR' : 'Chuyển khoản VietQR'}
            </DialogTitle>
            <DialogDescription className="text-center text-sm">
              {paymentInstructions?.instructions || 'Thông tin thanh toán chưa có sẵn.'}
              {paymentMethod === 'VIETQR' && (
                <span className="mt-2 block">
                  Bạn có thể đóng cửa sổ này bất cứ lúc nào; đơn hàng vẫn được lưu ở trạng thái chờ thanh toán.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4 py-4">
            {/* QR Code */}
            {qrUrl && !paymentInstructions?.demoMode && (
              <div className="rounded-lg border bg-white p-4">
                <img src={qrUrl} alt="Mã QR chuyển khoản VietQR" className="h-48 w-48 object-contain" />
              </div>
            )}
            {paymentInstructions?.demoMode && (
              <div role="alert" className="w-full rounded-lg border border-amber-300 bg-amber-50 p-4 text-center text-sm text-amber-900">
                <p className="font-semibold">DEMO — không có giao dịch ngân hàng thật</p>
                <p className="mt-1">Không quét mã hoặc chuyển tiền. Nút bên dưới chỉ mô phỏng kết quả thanh toán.</p>
              </div>
            )}
            {/* Order Info */}
            <div className="w-full space-y-3 rounded-lg bg-muted/50 p-4">
              <div className="flex justify-between gap-3 text-sm">
                <span className="font-medium">Mã đơn hàng</span>
                <span className="font-mono">{orderNumber || orderId}</span>
              </div>
              <div className="flex justify-between gap-3 text-sm">
                <span className="font-medium">Số tiền</span>
                <span className="text-lg font-semibold">{qrAmount.toLocaleString('vi-VN')} ₫</span>
              </div>
              {!paymentInstructions?.demoMode && paymentInstructions?.bankId && (
                <div className="flex justify-between gap-3 text-sm">
                  <span className="font-medium">Ngân hàng</span>
                  <span>{paymentInstructions.bankId}</span>
                </div>
              )}
              {!paymentInstructions?.demoMode && paymentInstructions?.accountNumber && (
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Tài khoản</span>
                  <span>{paymentInstructions.accountName} · {paymentInstructions.accountNumber}</span>
                </div>
              )}
            </div>
            {/* Status */}
            <div className="w-full space-y-2 text-center">
              <p className="text-sm font-medium text-amber-700">
                {paymentMethod === 'COD'
                  ? 'Thanh toán khi đơn hàng được giao'
                  : paymentInstructions?.demoMode
                    ? 'Đang chờ bạn mô phỏng thanh toán'
                    : vietQrManualConfirmation
                      ? 'Đang chờ admin đối soát giao dịch ngân hàng'
                      : 'Đang chờ ngân hàng xác nhận giao dịch'}
              </p>
              <p className="text-xs text-muted-foreground">
                {paymentInstructions?.verification || paymentInstructions?.instructions}
              </p>
            </div>
            {/* Instructions */}
            <div className="w-full space-y-1 rounded-lg border p-3 text-xs text-muted-foreground">
              <p className="flex items-center gap-1 font-medium text-foreground">
                <Info className="h-4 w-4" />
                Hướng dẫn thanh toán
              </p>
              <p>{paymentInstructions?.instructions}</p>
              {paymentMethod === 'VIETQR' && !paymentInstructions?.demoMode && (
                <p className="break-all font-medium text-foreground">
                  Nội dung chuyển khoản: {paymentInstructions?.reference}
                </p>
              )}
            </div>
            <div className="mt-4 flex w-full gap-3">
              <Button
                className="flex-1"
                onClick={() => paymentInstructions?.demoMode ? handleDemoPayment() : handleCheckPayment()}
                disabled={demoPaymentLoading}
                type="button"
              >
                {paymentInstructions?.demoMode
                  ? demoPaymentLoading ? 'Đang xử lý...' : 'Mô phỏng thanh toán thành công'
                  : paymentMethod === 'COD'
                    ? 'Kiểm tra đơn hàng'
                    : vietQrManualConfirmation ? 'Kiểm tra trạng thái đơn hàng' : 'Làm mới trạng thái'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (orderId) navigate(`/orders/${orderId}`);
                }}
                type="button"
              >
                Xem đơn hàng
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Checkout;
