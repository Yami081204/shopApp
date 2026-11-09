import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Edit, ImagePlus, Plus, Search, Trash2 } from 'lucide-react';
import { useAllContexts } from '@/hooks/useAllContexts';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { categoryService } from '@/services';
import { Category } from '@/types';

const Categories = () => {
  const { user, isAuthenticated, isAuthLoading } = useAllContexts();
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState({ name: '', description: '', image: '' });

  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      setCategories(await categoryService.getAllCategories());
    } catch (error) {
      toast({ title: 'Không thể tải danh mục', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { void loadCategories(); }, [loadCategories]);

  if (isAuthLoading) return <Skeleton className="h-60 w-full" />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!user?.isAdmin) return <Navigate to="/" replace />;

  const filtered = categories.filter((category) =>
    `${category.name} ${category.description || ''}`.toLowerCase().includes(search.toLowerCase())
  );

  const openDialog = (category?: Category) => {
    setEditing(category || null);
    setForm(category
      ? { name: category.name, description: category.description || '', image: category.image || '' }
      : { name: '', description: '', image: '' });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) {
      toast({ title: 'Tên danh mục là bắt buộc', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const payload = { name: form.name.trim(), description: form.description.trim(), image: form.image.trim() || undefined };
      if (editing) await categoryService.updateCategory(editing.id, payload);
      else await categoryService.createCategory(payload);
      toast({ title: editing ? 'Đã cập nhật danh mục' : 'Đã tạo danh mục' });
      setDialogOpen(false);
      await loadCategories();
    } catch (error) {
      toast({ title: 'Không thể lưu danh mục', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (category: Category) => {
    if (!window.confirm(`Xóa danh mục "${category.name}"?`)) return;
    try {
      await categoryService.deleteCategory(category.id);
      toast({ title: 'Đã xóa danh mục' });
      await loadCategories();
    } catch (error) {
      toast({ title: 'Không thể xóa danh mục', description: (error as Error).message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-sm text-muted-foreground">Danh mục cửa hàng</p><h1 className="text-2xl font-semibold">Quản lý danh mục</h1></div>
        <Button onClick={() => openDialog()}><Plus className="mr-2 h-4 w-4" /> Thêm danh mục</Button>
      </header>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Tìm danh mục..." value={search} onChange={(event) => setSearch(event.target.value)} />
      </div>

      <section className="overflow-x-auto rounded-xl border bg-white">
        <Table>
          <TableHeader><TableRow><TableHead>Danh mục</TableHead><TableHead>Mô tả</TableHead><TableHead>Sản phẩm đang bán</TableHead><TableHead className="text-right">Thao tác</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading ? Array.from({ length: 4 }, (_, index) => <TableRow key={index}><TableCell colSpan={4}><Skeleton className="h-6 w-full" /></TableCell></TableRow>)
              : filtered.length ? filtered.map((category) => (
                <TableRow key={category.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded bg-muted">
                        {category.image ? <img src={category.image} alt="" className="h-full w-full object-cover" /> : <ImagePlus className="h-4 w-4 text-muted-foreground" />}
                      </div>
                      <div><p className="font-medium">{category.name}</p><p className="text-xs text-muted-foreground">#{category.id}</p></div>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-sm text-sm text-muted-foreground">{category.description || '—'}</TableCell>
                  <TableCell><Badge variant="secondary">{category.count ?? 0}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" aria-label="Chỉnh sửa danh mục" onClick={() => openDialog(category)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" aria-label="Xóa danh mục" onClick={() => void remove(category)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              )) : <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">Không tìm thấy danh mục.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </section>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Chỉnh sửa danh mục' : 'Thêm danh mục'}</DialogTitle><DialogDescription>Thông tin được lưu vào hệ thống cửa hàng.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label htmlFor="category-name">Tên</Label><Input id="category-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></div>
            <div className="space-y-2"><Label htmlFor="category-description">Mô tả</Label><Textarea id="category-description" rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></div>
            <div className="space-y-2"><Label htmlFor="category-image">URL hình ảnh</Label><Input id="category-image" type="url" placeholder="https://..." value={form.image} onChange={(event) => setForm({ ...form, image: event.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Hủy</Button><Button onClick={() => void save()} disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Categories;
