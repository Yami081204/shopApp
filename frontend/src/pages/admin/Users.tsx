import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Eye, Search, Trash2, Users } from 'lucide-react';
import { useAllContexts } from '@/hooks/useAllContexts';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { userService } from '@/services';

interface AdminUser {
  id?: number;
  name: string;
  email: string;
  isAdmin: boolean;
  address?: string;
  phone?: string;
  createdAt?: string;
}

const UsersPage = () => {
  const { user, isAuthenticated, isAuthLoading } = useAllContexts();
  const { toast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      setUsers(await userService.getAllUsers());
    } catch (error) {
      toast({ title: 'Không thể tải người dùng', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { void loadUsers(); }, [loadUsers]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter((item) => !query || `${item.name} ${item.email} ${item.id || ''}`.toLowerCase().includes(query));
  }, [users, search]);

  if (isAuthLoading) return <Skeleton className="h-60 w-full" />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!user?.isAdmin) return <Navigate to="/" replace />;

  const removeUser = async (target: AdminUser) => {
    if (!target.id || String(target.id) === String(user.id)) return;
    if (!window.confirm(`Xóa tài khoản ${target.email}? Thao tác này không thể hoàn tác.`)) return;
    setDeletingId(target.id);
    try {
      await userService.deleteUser(target.id);
      toast({ title: 'Đã xóa tài khoản' });
      setSelected(null);
      await loadUsers();
    } catch (error) {
      toast({ title: 'Không thể xóa tài khoản', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-muted-foreground">Tài khoản và quyền truy cập</p>
        <h1 className="text-2xl font-semibold">Quản lý người dùng</h1>
      </header>

      <section className="flex flex-col gap-3 rounded-xl border bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Users className="h-4 w-4" /> {users.length} tài khoản</div>
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Tìm tên, email hoặc ID..." value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
      </section>

      <section className="overflow-x-auto rounded-xl border bg-white">
        <Table>
          <TableHeader><TableRow><TableHead>Người dùng</TableHead><TableHead>Email</TableHead><TableHead>Ngày đăng ký</TableHead><TableHead>Vai trò</TableHead><TableHead className="text-right">Thao tác</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading ? Array.from({ length: 5 }, (_, index) => <TableRow key={index}><TableCell colSpan={5}><Skeleton className="h-6 w-full" /></TableCell></TableRow>)
              : filtered.length ? filtered.map((item) => (
                <TableRow key={item.id}>
                  <TableCell><div className="font-medium">{item.name || '—'}</div><div className="text-xs text-muted-foreground">#{item.id}</div></TableCell>
                  <TableCell>{item.email}</TableCell>
                  <TableCell>{item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') : '—'}</TableCell>
                  <TableCell><Badge variant={item.isAdmin ? 'default' : 'secondary'}>{item.isAdmin ? 'Admin' : 'Khách hàng'}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" aria-label="Xem người dùng" onClick={() => setSelected(item)}><Eye className="h-4 w-4" /></Button>
                    {!item.isAdmin && String(item.id) !== String(user.id) && (
                      <Button variant="ghost" size="icon" aria-label="Xóa người dùng" disabled={deletingId === item.id} onClick={() => void removeUser(item)}><Trash2 className="h-4 w-4" /></Button>
                    )}
                  </TableCell>
                </TableRow>
              )) : <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">Không tìm thấy người dùng.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </section>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent>
          {selected && <>
            <DialogHeader><DialogTitle>Thông tin tài khoản</DialogTitle><DialogDescription>ID #{selected.id} · {selected.isAdmin ? 'Quản trị viên' : 'Khách hàng'}</DialogDescription></DialogHeader>
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div><dt className="text-muted-foreground">Họ tên</dt><dd className="mt-1 font-medium">{selected.name}</dd></div>
              <div><dt className="text-muted-foreground">Email</dt><dd className="mt-1 font-medium">{selected.email}</dd></div>
              <div><dt className="text-muted-foreground">Điện thoại</dt><dd className="mt-1">{selected.phone || 'Chưa cập nhật'}</dd></div>
              <div><dt className="text-muted-foreground">Ngày đăng ký</dt><dd className="mt-1">{selected.createdAt ? new Date(selected.createdAt).toLocaleString('vi-VN') : '—'}</dd></div>
              <div className="sm:col-span-2"><dt className="text-muted-foreground">Địa chỉ</dt><dd className="mt-1">{selected.address || 'Chưa cập nhật'}</dd></div>
            </dl>
            <DialogFooter>
              {!selected.isAdmin && String(selected.id) !== String(user.id) && <Button variant="destructive" disabled={deletingId === selected.id} onClick={() => void removeUser(selected)}><Trash2 className="mr-2 h-4 w-4" /> Xóa tài khoản</Button>}
              <Button variant="outline" onClick={() => setSelected(null)}>Đóng</Button>
            </DialogFooter>
          </>}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UsersPage;
