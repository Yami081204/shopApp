import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Eye, Search, ShoppingBag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAllContexts } from '@/hooks/useAllContexts';
import { useToast } from '@/hooks/use-toast';
import { orderService } from '@/services';
import { paymentService } from '@/services/paymentService';
import { Order } from '@/types';

const PAGE_SIZE = 20;
const allowedNextStatuses: Record<string, string[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPING', 'CANCELLED'],
  SHIPPING: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: []
};

const formatCurrency = (value: number) => new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0
}).format(Number(value) || 0);

const formatDate = (value?: string | Date | null) => value
  ? new Intl.DateTimeFormat('vi-VN', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
  }).format(new Date(value))
  : '—';

const AdminOrders = () => {
  const { user, isAuthenticated, isAuthLoading } = useAllContexts();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [transactionReference, setTransactionReference] = useState('');
  const [reconciledAmount, setReconciledAmount] = useState('');
  const [statusToSet, setStatusToSet] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [manualVietQrConfirmation, setManualVietQrConfirmation] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const result = await orderService.getOrdersPage({
        page,
        limit: PAGE_SIZE,
        status: statusFilter,
        search: search.trim() || undefined
      });
      setOrders(result.data);
      setTotal(result.count);
    } catch (error) {
      toast({ title: 'Không thể tải đơn hàng', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, toast]);

  useEffect(() => { void fetchOrders(); }, [fetchOrders]);

  useEffect(() => {
    let active = true;
    paymentService.getAvailableMethods()
      .then(({ vietQrManualConfirmation }) => {
        if (active) setManualVietQrConfirmation(vietQrManualConfirmation);
      })
      .catch((error: unknown) => {
        if (active) {
          toast({
            title: 'Không thể tải cấu hình thanh toán',
            description: error instanceof Error ? error.message : 'Vui lòng thử tải lại trang.',
            variant: 'destructive'
          });
        }
      });
    return () => { active = false; };
  }, [toast]);

  const openOrder = async (order: Order) => {
    setSelectedOrder(order);
    setTransactionReference('');
    setReconciledAmount('');
    setStatusNote('');
    setStatusToSet(allowedNextStatuses[order.orderStatus || order.status]?.[0] || '');
    try {
      setSelectedOrder(await orderService.getOrderById(order.id));
    } catch (error) {
      toast({ title: 'Không thể tải chi tiết đơn hàng', description: (error as Error).message, variant: 'destructive' });
    }
  };

  const closeDetails = () => {
    setSelectedOrder(null);
    setTransactionReference('');
    setReconciledAmount('');
  };

  const refreshSelectedOrder = async (id: number) => {
    await fetchOrders();
    setSelectedOrder(await orderService.getOrderById(id));
  };

  const confirmPayment = async () => {
    if (!selectedOrder || !transactionReference.trim() || !reconciledAmount.trim()) return;
    try {
      setSubmitting(true);
      await orderService.confirmPayment(selectedOrder.id, transactionReference.trim(), Number(reconciledAmount));
      toast({ title: 'Đã xác nhận thanh toán', description: 'Đã ghi nhận người xác nhận và thời gian đối soát.' });
      setTransactionReference('');
      setReconciledAmount('');
      await refreshSelectedOrder(selectedOrder.id);
    } catch (error) {
      toast({ title: 'Không thể xác nhận thanh toán', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async () => {
    if (!selectedOrder || !statusToSet) return;
    try {
      setStatusSubmitting(true);
      await orderService.updateOrderStatus(String(selectedOrder.id), statusToSet, statusNote.trim());
      toast({ title: 'Đã cập nhật trạng thái đơn hàng' });
      await refreshSelectedOrder(selectedOrder.id);
      setStatusToSet('');
      setStatusNote('');
    } catch (error) {
      toast({ title: 'Không thể cập nhật trạng thái', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setStatusSubmitting(false);
    }
  };

  if (isAuthLoading) return <Skeleton className="h-60 w-full" />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!user?.isAdmin) return <Navigate to="/" replace />;

  const paymentStatus = selectedOrder?.payment?.status || (selectedOrder?.isPaid ? 'PAID' : 'PENDING');
  const pendingTransferReports = selectedOrder?.paymentTransactions?.filter(
    (transaction) => transaction.paymentMethod === 'VIETQR' && transaction.status === 'PENDING'
  ) || [];
  const isCod = selectedOrder?.paymentMethod === 'COD' || selectedOrder?.payment?.paymentMethod === 'COD';
  const canConfirmPayment = paymentStatus !== 'PAID' && (isCod
    ? selectedOrder?.orderStatus === 'DELIVERED' || selectedOrder?.status === 'delivered'
    : manualVietQrConfirmation
      ? selectedOrder?.paymentMethod === 'VIETQR' || selectedOrder?.payment?.paymentMethod === 'VIETQR'
      : pendingTransferReports.length > 0);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-muted-foreground">Vận hành cửa hàng</p>
        <h1 className="text-2xl font-semibold">Đơn hàng và thanh toán</h1>
      </header>

      <section className="flex flex-col gap-3 rounded-xl border bg-white p-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Tìm mã đơn hàng hoặc ID..." value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
        </div>
        <select aria-label="Lọc trạng thái đơn hàng" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }} className="h-10 rounded-md border bg-background px-3 text-sm">
          <option value="ALL">Tất cả trạng thái</option>
          {['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPING', 'DELIVERED', 'CANCELLED'].map((status) => <option key={status} value={status}>{status}</option>)}
        </select>
      </section>

      <section className="overflow-x-auto rounded-xl border bg-white">
        <Table>
          <TableHeader><TableRow><TableHead>Mã đơn</TableHead><TableHead>Khách hàng</TableHead><TableHead>Ngày đặt</TableHead><TableHead>Tổng tiền</TableHead><TableHead>Đơn hàng</TableHead><TableHead>Thanh toán</TableHead><TableHead className="text-right">Chi tiết</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading ? Array.from({ length: 5 }, (_, index) => <TableRow key={index}><TableCell colSpan={7}><Skeleton className="h-5 w-full" /></TableCell></TableRow>)
              : orders.length ? orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.orderNumber || `#${order.id}`}</TableCell>
                  <TableCell><div>{order.user?.name || '—'}</div><div className="text-xs text-muted-foreground">{order.user?.email}</div></TableCell>
                  <TableCell>{formatDate(order.createdAt)}</TableCell>
                  <TableCell className="whitespace-nowrap">{formatCurrency(order.totalPrice)}</TableCell>
                  <TableCell><Badge variant="outline">{order.orderStatus || order.status}</Badge></TableCell>
                  <TableCell><Badge variant={order.payment?.status === 'PAID' || order.isPaid ? 'default' : 'secondary'}>{order.payment?.status || (order.isPaid ? 'PAID' : 'PENDING')}</Badge></TableCell>
                  <TableCell className="text-right"><Button variant="ghost" size="icon" aria-label="Xem chi tiết đơn hàng" onClick={() => void openOrder(order)}><Eye className="h-4 w-4" /></Button></TableCell>
                </TableRow>
              )) : <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground"><ShoppingBag className="mx-auto mb-2 h-8 w-8" />Không có đơn hàng phù hợp.</TableCell></TableRow>}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between border-t p-4">
          <span className="text-sm text-muted-foreground">{total} đơn hàng</span>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>Trước</Button>
            <span className="text-sm text-muted-foreground">{page} / {Math.max(1, Math.ceil(total / PAGE_SIZE))}</span>
            <Button variant="outline" size="sm" disabled={page >= Math.ceil(total / PAGE_SIZE) || loading} onClick={() => setPage((value) => value + 1)}>Tiếp</Button>
          </div>
        </div>
      </section>

      <Dialog open={Boolean(selectedOrder)} onOpenChange={(open) => { if (!open) closeDetails(); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          {selectedOrder && <>
            <DialogHeader>
              <DialogTitle>Đơn hàng {selectedOrder.orderNumber || `#${selectedOrder.id}`}</DialogTitle>
              <DialogDescription>{formatDate(selectedOrder.createdAt)} · {selectedOrder.user?.name || 'Khách hàng'} · {selectedOrder.user?.email || '—'}{selectedOrder.user?.phone ? ` · ${selectedOrder.user.phone}` : ''}</DialogDescription>
            </DialogHeader>

            <section className="rounded border p-3 text-sm">
              <h3 className="mb-1 font-medium">Thông tin giao hàng</h3>
              <p className="whitespace-pre-wrap text-muted-foreground">
                {typeof selectedOrder.shippingAddress === 'string'
                  ? selectedOrder.shippingAddress.replace(/;\s*/g, ' · ')
                  : [
                    selectedOrder.shippingAddress?.address,
                    selectedOrder.shippingAddress?.city,
                    selectedOrder.shippingAddress?.postalCode,
                    selectedOrder.shippingAddress?.country
                  ].filter(Boolean).join(', ')}
              </p>
            </section>

            <section className="space-y-1 rounded border p-3 text-sm">
              <p>Phương thức: {selectedOrder.payment?.paymentMethod || selectedOrder.paymentMethod}</p>
              <p>Số tiền cần thanh toán: {formatCurrency(selectedOrder.payment?.amount ?? selectedOrder.totalPrice)}</p>
              <p>Trạng thái thanh toán: {paymentStatus}</p>
              <p>Mã giao dịch YAMI: {selectedOrder.payment?.paymentReference || '—'}</p>
              <p>Tạo giao dịch: {formatDate(selectedOrder.payment?.createdAt)}</p>
              <p>Xác nhận: {formatDate(selectedOrder.payment?.confirmedAt)}</p>
              {selectedOrder.payment?.confirmedBy && <p>Người xác nhận ID: {selectedOrder.payment.confirmedBy}</p>}
            </section>

            <section>
              <h3 className="mb-2 font-medium">Sản phẩm</h3>
              <ul className="space-y-2 text-sm">
                {selectedOrder.orderItems?.map((item) => (
                  <li key={item.id} className="flex justify-between gap-4 border-b pb-2">
                    <span>{item.productName || item.product?.name || `Sản phẩm #${item.productId}`} × {item.quantity}</span>
                    <span className="whitespace-nowrap">{formatCurrency(item.price * item.quantity)}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h3 className="mb-2 font-medium">Giao dịch thanh toán</h3>
              {selectedOrder.paymentTransactions?.length ? (
                <div className="space-y-2">
                  {selectedOrder.paymentTransactions.map((transaction) => (
                    <div key={transaction.id} className="rounded border p-3 text-sm">
                      <p className="break-all font-medium">{transaction.transactionReference} · {transaction.status}</p>
                      <p>Số tiền: {formatCurrency(transaction.amount)} · Báo lúc: {formatDate(transaction.reportedAt || transaction.createdAt)}</p>
                      <p>Xác nhận lúc: {formatDate(transaction.confirmedAt)}</p>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-muted-foreground">Chưa có báo cáo giao dịch.</p>}
            </section>

            {paymentStatus !== 'PAID' && (
              <section className="space-y-3 rounded border p-3">
                <h3 className="font-medium">Đối soát thanh toán</h3>
                {isCod ? (
                  <p className="text-sm text-muted-foreground">
                    COD chỉ có thể xác nhận sau khi đơn đã giao và tiền được thu thực tế.
                    {selectedOrder.orderStatus !== 'DELIVERED' && selectedOrder.status !== 'delivered' ? ' Đơn hàng này chưa giao.' : ''}
                  </p>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      {manualVietQrConfirmation
                        ? 'Đối chiếu giao dịch tiền vào trong tài khoản ngân hàng. Chỉ xác nhận sau khi đã thấy tiền thực nhận; nhập mã giao dịch từ sao kê bên dưới.'
                        : 'Chọn báo cáo chuyển khoản của đơn này sau khi đã đối chiếu trực tiếp với giao dịch ngân hàng.'}
                    </p>
                    {pendingTransferReports.length > 0 && (
                    <div className="space-y-2">
                      <Label htmlFor="reported-transaction">Báo cáo giao dịch chờ xác nhận (nếu có)</Label>
                      <select id="reported-transaction" value={pendingTransferReports.some((item) => item.transactionReference === transactionReference) ? transactionReference : ''} onChange={(event) => {
                        const report = pendingTransferReports.find((item) => item.transactionReference === event.target.value);
                        setTransactionReference(event.target.value);
                        setReconciledAmount(report ? String(report.amount) : '');
                      }} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                        <option value="">Chọn báo cáo đã gửi</option>
                        {pendingTransferReports.map((transaction) => (
                          <option key={transaction.id} value={transaction.transactionReference}>
                            {transaction.transactionReference} · {formatCurrency(transaction.amount)}
                          </option>
                        ))}
                      </select>
                    </div>
                    )}
                    {manualVietQrConfirmation && (
                      <div className="space-y-2">
                        <Label htmlFor="bank-transaction-reference">Mã giao dịch trên sao kê ngân hàng</Label>
                        <Input
                          id="bank-transaction-reference"
                          placeholder="Nhập mã giao dịch ngân hàng"
                          maxLength={191}
                          value={transactionReference}
                          onChange={(event) => setTransactionReference(event.target.value)}
                        />
                      </div>
                    )}
                      {!pendingTransferReports.length && !manualVietQrConfirmation && (
                        <p className="text-xs text-muted-foreground">Không có báo cáo chuyển khoản chờ xác nhận cho đơn hàng này.</p>
                      )}
                  </>
                )}
                {canConfirmPayment && (
                  <>
                    {isCod && <div className="space-y-2"><Label htmlFor="cod-receipt">Mã biên nhận thu COD</Label><Input id="cod-receipt" value={transactionReference} maxLength={191} onChange={(event) => setTransactionReference(event.target.value)} /></div>}
                    <div className="space-y-2">
                      <Label htmlFor="reconciled-amount">Số tiền đã đối soát (VND)</Label>
                      <Input id="reconciled-amount" type="number" min="0.01" step="0.01" value={reconciledAmount} onChange={(event) => setReconciledAmount(event.target.value)} />
                    </div>
                    <Button onClick={() => void confirmPayment()} disabled={submitting || !transactionReference.trim() || !reconciledAmount.trim()}>
                      {submitting ? 'Đang xác nhận...' : 'Xác nhận đã nhận tiền'}
                    </Button>
                  </>
                )}
                {!canConfirmPayment && !isCod && <p className="text-xs text-muted-foreground">Chỉ báo cáo giao dịch thuộc chính đơn hàng này mới có thể được xác nhận.</p>}
              </section>
            )}

            <section>
              <h3 className="mb-2 font-medium">Lịch sử trạng thái</h3>
              {selectedOrder.orderStatusHistories?.length ? (
                <ol className="space-y-2 border-l pl-4 text-sm">
                  {selectedOrder.orderStatusHistories.map((entry) => (
                    <li key={entry.id}>
                      <span className="font-medium">{entry.fromStatus || 'Mới tạo'} → {entry.toStatus}</span>
                      <span className="ml-2 text-muted-foreground">{formatDate(entry.createdAt)}</span>
                      {entry.note && <p className="text-muted-foreground">{entry.note}</p>}
                    </li>
                  ))}
                </ol>
              ) : <p className="text-sm text-muted-foreground">Chưa có lịch sử trạng thái.</p>}
            </section>

            {(allowedNextStatuses[selectedOrder.orderStatus || selectedOrder.status] || []).length > 0 && (
              <section className="space-y-3 rounded border p-3">
                <h3 className="font-medium">Cập nhật trạng thái đơn hàng</h3>
                <div className="space-y-2">
                  <Label htmlFor="order-status">Trạng thái tiếp theo</Label>
                  <select id="order-status" value={statusToSet} onChange={(event) => setStatusToSet(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                    {(allowedNextStatuses[selectedOrder.orderStatus || selectedOrder.status] || []).map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </div>
                <div className="space-y-2"><Label htmlFor="order-note">Ghi chú (không bắt buộc)</Label><Input id="order-note" maxLength={500} value={statusNote} onChange={(event) => setStatusNote(event.target.value)} /></div>
                <Button onClick={() => void updateStatus()} disabled={statusSubmitting || !statusToSet}>{statusSubmitting ? 'Đang cập nhật...' : 'Cập nhật trạng thái'}</Button>
              </section>
            )}
          </>}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminOrders;
