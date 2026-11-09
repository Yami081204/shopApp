import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Edit, Plus, Ticket, Trash2 } from 'lucide-react';
import { useAllContexts } from '@/hooks/useAllContexts';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getApiErrorMessage } from '@/lib/apiError';
import { voucherService, Voucher, VoucherPayload } from '@/services';

type VoucherForm = {
  code: string;
  type: Voucher['type'];
  value: string;
  minimumOrderAmount: string;
  maximumDiscount: string;
  usageLimit: string;
  startsAt: string;
  expiresAt: string;
  isActive: boolean;
};

const emptyForm: VoucherForm = {
  code: '', type: 'PERCENTAGE', value: '', minimumOrderAmount: '0',
  maximumDiscount: '', usageLimit: '', startsAt: '', expiresAt: '', isActive: true
};

const currency = (value: number) => new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0
}).format(Number(value) || 0);

const dateInputValue = (value: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

const Vouchers = () => {
  const { user, isAuthenticated, isAuthLoading } = useAllContexts();
  const { toast } = useToast();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Voucher | null>(null);
  const [form, setForm] = useState<VoucherForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setVouchers(await voucherService.getVouchers());
    } catch (error) {
      toast({ title: 'Không thể tải voucher', description: getApiErrorMessage(error, 'Vui lòng thử lại.'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { void load(); }, [load]);

  if (isAuthLoading) return <Skeleton className="h-60 w-full" />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!user?.isAdmin) return <Navigate to="/" replace />;

  const openForm = (voucher?: Voucher) => {
    setEditing(voucher || null);
    setForm(voucher ? {
      code: voucher.code,
      type: voucher.type,
      value: String(voucher.value),
      minimumOrderAmount: String(voucher.minimumOrderAmount),
      maximumDiscount: voucher.maximumDiscount === null ? '' : String(voucher.maximumDiscount),
      usageLimit: voucher.usageLimit === null ? '' : String(voucher.usageLimit),
      startsAt: dateInputValue(voucher.startsAt),
      expiresAt: dateInputValue(voucher.expiresAt),
      isActive: voucher.isActive
    } : { ...emptyForm });
    setDialogOpen(true);
  };

  const save = async () => {
    const value = Number(form.value);
    const minimumOrderAmount = Number(form.minimumOrderAmount);
    const maximumDiscount = form.maximumDiscount ? Number(form.maximumDiscount) : null;
    const usageLimit = form.usageLimit ? Number(form.usageLimit) : null;
    const startsAt = form.startsAt ? new Date(form.startsAt) : null;
    const expiresAt = form.expiresAt ? new Date(form.expiresAt) : null;
    if (!/^[A-Za-z0-9_-]{2,64}$/.test(form.code.trim()) || !Number.isFinite(value) || value <= 0 ||
      !Number.isFinite(minimumOrderAmount) || minimumOrderAmount < 0 ||
      (form.type === 'PERCENTAGE' && value > 100) ||
      (maximumDiscount !== null && (!Number.isFinite(maximumDiscount) || maximumDiscount <= 0)) ||
      (usageLimit !== null && (!Number.isSafeInteger(usageLimit) || usageLimit < 1)) ||
      (startsAt && Number.isNaN(startsAt.getTime())) ||
      (expiresAt && Number.isNaN(expiresAt.getTime())) ||
      (startsAt && expiresAt && startsAt >= expiresAt)) {
      toast({ title: 'Dữ liệu voucher không hợp lệ', description: 'Kiểm tra mã, mức giảm và giới hạn sử dụng.', variant: 'destructive' });
      return;
    }

    const payload: VoucherPayload = {
      code: form.code.trim().toUpperCase(),
      type: form.type,
      value,
      minimumOrderAmount,
      maximumDiscount,
      usageLimit,
      startsAt: startsAt?.toISOString() || null,
      expiresAt: expiresAt?.toISOString() || null,
      isActive: form.isActive
    };

    setSaving(true);
    try {
      if (editing) await voucherService.updateVoucher(editing.id, payload);
      else await voucherService.createVoucher(payload);
      toast({ title: editing ? 'Đã cập nhật voucher' : 'Đã tạo voucher' });
      setDialogOpen(false);
      await load();
    } catch (error) {
      toast({ title: 'Không thể lưu voucher', description: getApiErrorMessage(error, 'Vui lòng thử lại.'), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async (voucher: Voucher) => {
    if (!window.confirm(`Ngừng kích hoạt mã ${voucher.code}?`)) return;
    try {
      await voucherService.deactivateVoucher(voucher.id);
      toast({ title: 'Đã ngừng kích hoạt voucher' });
      await load();
    } catch (error) {
      toast({ title: 'Không thể ngừng voucher', description: getApiErrorMessage(error, 'Vui lòng thử lại.'), variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-sm text-muted-foreground">Khuyến mãi</p><h1 className="text-2xl font-semibold">Quản lý voucher</h1></div>
        <Button onClick={() => openForm()}><Plus className="mr-2 h-4 w-4" /> Tạo voucher</Button>
      </header>

      <section className="overflow-x-auto rounded-xl border bg-white">
        <Table>
          <TableHeader><TableRow><TableHead>Mã</TableHead><TableHead>Ưu đãi</TableHead><TableHead>Đơn tối thiểu</TableHead><TableHead>Lượt dùng</TableHead><TableHead>Hiệu lực</TableHead><TableHead>Trạng thái</TableHead><TableHead className="text-right">Thao tác</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading ? Array.from({ length: 4 }, (_, index) => <TableRow key={index}><TableCell colSpan={7}><Skeleton className="h-6 w-full" /></TableCell></TableRow>)
              : vouchers.length ? vouchers.map((voucher) => (
                <TableRow key={voucher.id}>
                  <TableCell className="font-mono font-medium">{voucher.code}</TableCell>
                  <TableCell>{voucher.type === 'PERCENTAGE' ? `${voucher.value}%` : currency(voucher.value)}</TableCell>
                  <TableCell>{currency(voucher.minimumOrderAmount)}</TableCell>
                  <TableCell>{voucher.usageCount}{voucher.usageLimit === null ? ' / không giới hạn' : ` / ${voucher.usageLimit}`}</TableCell>
                  <TableCell className="text-xs">{voucher.startsAt ? new Date(voucher.startsAt).toLocaleDateString('vi-VN') : 'Ngay'} – {voucher.expiresAt ? new Date(voucher.expiresAt).toLocaleDateString('vi-VN') : 'Không hết hạn'}</TableCell>
                  <TableCell><Badge variant={voucher.isActive ? 'default' : 'secondary'}>{voucher.isActive ? 'Hoạt động' : 'Đã tắt'}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" aria-label="Chỉnh sửa voucher" onClick={() => openForm(voucher)}><Edit className="h-4 w-4" /></Button>
                    {voucher.isActive && <Button variant="ghost" size="icon" aria-label="Tắt voucher" onClick={() => void deactivate(voucher)}><Trash2 className="h-4 w-4" /></Button>}
                  </TableCell>
                </TableRow>
              )) : <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground"><Ticket className="mx-auto mb-2 h-8 w-8" />Chưa có voucher.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </section>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader><DialogTitle>{editing ? 'Chỉnh sửa voucher' : 'Tạo voucher'}</DialogTitle><DialogDescription>Voucher được xác thực và áp dụng tại backend khi tạo đơn hàng.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="voucher-code">Mã</Label><Input id="voucher-code" value={form.code} maxLength={64} onChange={(event) => setForm({ ...form, code: event.target.value })} /></div>
            <div className="space-y-2"><Label htmlFor="voucher-type">Loại giảm giá</Label><select id="voucher-type" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as Voucher['type'] })} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="PERCENTAGE">Phần trăm</option><option value="FIXED">Số tiền cố định</option></select></div>
            <div className="space-y-2"><Label htmlFor="voucher-value">Mức giảm {form.type === 'PERCENTAGE' ? '(%)' : '(VND)'}</Label><Input id="voucher-value" type="number" min="0.01" step="0.01" value={form.value} onChange={(event) => setForm({ ...form, value: event.target.value })} /></div>
            <div className="space-y-2"><Label htmlFor="voucher-minimum">Đơn hàng tối thiểu (VND)</Label><Input id="voucher-minimum" type="number" min="0" value={form.minimumOrderAmount} onChange={(event) => setForm({ ...form, minimumOrderAmount: event.target.value })} /></div>
            <div className="space-y-2"><Label htmlFor="voucher-max-discount">Giảm tối đa (không bắt buộc)</Label><Input id="voucher-max-discount" type="number" min="1" value={form.maximumDiscount} onChange={(event) => setForm({ ...form, maximumDiscount: event.target.value })} /></div>
            <div className="space-y-2"><Label htmlFor="voucher-limit">Giới hạn lượt dùng</Label><Input id="voucher-limit" type="number" min="1" value={form.usageLimit} onChange={(event) => setForm({ ...form, usageLimit: event.target.value })} placeholder="Không giới hạn" /></div>
            <div className="space-y-2"><Label htmlFor="voucher-start">Bắt đầu</Label><Input id="voucher-start" type="datetime-local" value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} /></div>
            <div className="space-y-2"><Label htmlFor="voucher-expiry">Kết thúc</Label><Input id="voucher-expiry" type="datetime-local" value={form.expiresAt} onChange={(event) => setForm({ ...form, expiresAt: event.target.value })} /></div>
            {editing && <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} /> Đang hoạt động</label>}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Hủy</Button><Button onClick={() => void save()} disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu voucher'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Vouchers;
