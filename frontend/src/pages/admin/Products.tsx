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
import { categoryService, getManageProductsPage, createProduct, updateProduct, deleteProduct } from '@/services';
import { Category, Product } from '@/types';

const PAGE_SIZE = 20;
type ProductForm = {
  name: string;
  description: string;
  price: string;
  salePrice: string;
  countInStock: string;
  categoryId: string;
  image: string;
  isActive: boolean;
  variantsEnabled: boolean;
  variants: VariantForm[];
};

type VariantForm = {
  id?: number;
  sku: string;
  size: string;
  color: string;
  stock: string;
  isActive: boolean;
};

const emptyForm: ProductForm = {
  name: '',
  description: '',
  price: '',
  salePrice: '',
  countInStock: '0',
  categoryId: '',
  image: '',
  isActive: true,
  variantsEnabled: false,
  variants: []
};

const currency = (amount: number) => new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0
}).format(Number(amount) || 0);

const AdminProducts = () => {
  const { user, isAuthenticated, isAuthLoading } = useAllContexts();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getManageProductsPage({
        search: search.trim() || undefined,
        categoryId: categoryId || undefined,
        page,
        limit: PAGE_SIZE
      });
      setProducts(result.rows);
      setTotal(result.count);
    } catch (error) {
      toast({ title: 'Không thể tải sản phẩm', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [categoryId, page, search, toast]);

  useEffect(() => { void loadProducts(); }, [loadProducts]);

  useEffect(() => {
    categoryService.getAllCategories().then(setCategories).catch((error: unknown) => {
      toast({ title: 'Không thể tải danh mục', description: (error as Error).message, variant: 'destructive' });
    });
  }, [toast]);

  if (isAuthLoading) return <Skeleton className="h-60 w-full" />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!user?.isAdmin) return <Navigate to="/" replace />;

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, categoryId: categories[0] ? String(categories[0].id) : '' });
    setDialogOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditing(product);
    setForm({
      name: product.name,
      description: product.description || '',
      price: String(product.price),
      salePrice: product.salePrice === null || product.salePrice === undefined ? '' : String(product.salePrice),
      countInStock: String(product.countInStock),
      categoryId: String(product.categoryId),
      image: product.image || '',
      isActive: product.isActive !== false,
      variantsEnabled: Boolean(product.variants?.length),
      variants: (product.variants || []).map((variant) => ({
        id: variant.id,
        sku: variant.sku,
        size: variant.size,
        color: variant.color,
        stock: String(variant.stock),
        isActive: variant.isActive
      }))
    });
    setDialogOpen(true);
  };

  const saveProduct = async () => {
    const price = Number(form.price);
    const salePrice = form.salePrice.trim() ? Number(form.salePrice) : null;
    const seenVariants = new Set<string>();
    const invalidVariant = form.variantsEnabled && form.variants.some((variant) => {
      const optionKey = `${variant.size.trim().toLocaleLowerCase()}|${variant.color.trim().toLocaleLowerCase()}`;
      const invalid = !variant.sku.trim() || !variant.size.trim() || !variant.color.trim() ||
        !Number.isSafeInteger(Number(variant.stock)) || Number(variant.stock) < 0 ||
        seenVariants.has(optionKey);
      seenVariants.add(optionKey);
      return invalid;
    });
    if (!form.name.trim() || !form.categoryId || !Number.isFinite(price) || price <= 0 ||
      (salePrice !== null && (!Number.isFinite(salePrice) || salePrice < 0 || salePrice >= price)) ||
      (!form.variantsEnabled && (!Number.isInteger(Number(form.countInStock)) || Number(form.countInStock) < 0)) ||
      invalidVariant) {
      toast({
        title: 'Kiểm tra thông tin',
        description: invalidVariant
          ? 'Mỗi biến thể cần SKU, màu, size riêng biệt và tồn kho là số nguyên không âm.'
          : 'Tên, danh mục, giá hợp lệ, giá khuyến mãi thấp hơn giá bán và tồn kho hợp lệ là bắt buộc.',
        variant: 'destructive'
      });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        price,
        salePrice,
        countInStock: form.variantsEnabled
          ? form.variants.filter((variant) => variant.isActive).reduce((sum, variant) => sum + Number(variant.stock), 0)
          : Number(form.countInStock),
        categoryId: Number(form.categoryId),
        image: form.image.trim() || null,
        isActive: form.isActive,
        ...(form.variantsEnabled ? {
          variants: form.variants.map((variant) => ({
            ...variant,
            stock: Number(variant.stock)
          }))
        } : {})
      };
      if (editing) await updateProduct(editing.id, payload);
      else await createProduct(payload as Omit<Product, 'id'>);
      toast({ title: editing ? 'Đã cập nhật sản phẩm' : 'Đã tạo sản phẩm' });
      setDialogOpen(false);
      await loadProducts();
    } catch (error) {
      toast({ title: 'Không thể lưu sản phẩm', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const archiveProduct = async (product: Product) => {
    if (!window.confirm(`Ngừng kinh doanh sản phẩm "${product.name}"?`)) return;
    try {
      await deleteProduct(product.id);
      toast({ title: 'Đã ngừng kinh doanh sản phẩm' });
      await loadProducts();
    } catch (error) {
      toast({ title: 'Không thể ngừng kinh doanh', description: (error as Error).message, variant: 'destructive' });
    }
  };

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-muted-foreground">Kho hàng</p>
          <h1 className="text-2xl font-semibold">Quản lý sản phẩm</h1>
        </div>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> Thêm sản phẩm</Button>
      </header>

      <section className="flex flex-col gap-3 rounded-xl border bg-white p-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Tìm tên hoặc mã sản phẩm..." value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
        </div>
        <select value={categoryId} onChange={(event) => { setCategoryId(event.target.value); setPage(1); }} className="h-10 rounded-md border bg-background px-3 text-sm">
          <option value="">Tất cả danh mục</option>
          {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
      </section>

      <section className="overflow-x-auto rounded-xl border bg-white">
        <Table>
          <TableHeader><TableRow><TableHead>Sản phẩm</TableHead><TableHead>Danh mục</TableHead><TableHead>Giá</TableHead><TableHead>Tồn kho</TableHead><TableHead>Trạng thái</TableHead><TableHead className="text-right">Thao tác</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading ? Array.from({ length: 5 }, (_, index) => <TableRow key={index}><TableCell colSpan={6}><Skeleton className="h-6 w-full" /></TableCell></TableRow>)
              : products.length ? products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="flex min-w-[220px] items-center gap-3">
                      <div className="h-12 w-10 overflow-hidden rounded bg-muted">
                        {product.image ? <img src={product.image} alt="" className="h-full w-full object-cover" /> : <ImagePlus className="m-3 h-4 w-4 text-muted-foreground" />}
                      </div>
                      <div><p className="font-medium">{product.name}</p><p className="text-xs text-muted-foreground">#{product.id}</p></div>
                    </div>
                  </TableCell>
                  <TableCell>{product.category?.name || categories.find((category) => category.id === product.categoryId)?.name || '—'}</TableCell>
                  <TableCell className="whitespace-nowrap">{currency(product.price)}</TableCell>
                  <TableCell>{product.countInStock}</TableCell>
                  <TableCell><Badge variant={product.isActive === false ? 'secondary' : 'default'}>{product.isActive === false ? 'Ngừng bán' : 'Đang bán'}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" aria-label="Chỉnh sửa sản phẩm" onClick={() => openEdit(product)}><Edit className="h-4 w-4" /></Button>
                    {product.isActive !== false && <Button variant="ghost" size="sm" onClick={() => void archiveProduct(product)}>Ngừng bán</Button>}
                  </TableCell>
                </TableRow>
              )) : <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">Không tìm thấy sản phẩm.</TableCell></TableRow>}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between border-t p-4">
          <p className="text-sm text-muted-foreground">{total} sản phẩm</p>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>Trước</Button>
            <span className="text-sm text-muted-foreground">{page} / {pageCount}</span>
            <Button variant="outline" size="sm" disabled={page >= pageCount || loading} onClick={() => setPage((value) => value + 1)}>Tiếp</Button>
            <Button variant="ghost" size="sm" onClick={() => void loadProducts()}>Tải lại</Button>
          </div>
        </div>
      </section>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm'}</DialogTitle>
            <DialogDescription>Thông tin được lưu qua API quản trị. Hình ảnh hiện nhận URL vì backend chưa có upload endpoint.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="product-name">Tên sản phẩm</Label><Input id="product-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></div>
            <div className="space-y-2"><Label htmlFor="product-category">Danh mục</Label><select id="product-category" value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="">Chọn danh mục</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div>
            <div className="space-y-2"><Label htmlFor="product-price">Giá (VND)</Label><Input id="product-price" type="number" min="1" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} /></div>
            <div className="space-y-2"><Label htmlFor="product-sale-price">Giá khuyến mãi (VND)</Label><Input id="product-sale-price" type="number" min="0" value={form.salePrice} onChange={(event) => setForm({ ...form, salePrice: event.target.value })} placeholder="Không áp dụng" /></div>
            <div className="space-y-2"><Label htmlFor="product-stock">Tồn kho tổng</Label><Input id="product-stock" type="number" min="0" step="1" value={form.variantsEnabled ? form.variants.filter((variant) => variant.isActive).reduce((sum, variant) => sum + (Number(variant.stock) || 0), 0) : form.countInStock} disabled={form.variantsEnabled} onChange={(event) => setForm({ ...form, countInStock: event.target.value })} /></div>
            <div className="space-y-2"><Label htmlFor="product-image">URL hình ảnh</Label><Input id="product-image" type="url" value={form.image} onChange={(event) => setForm({ ...form, image: event.target.value })} placeholder="https://..." /></div>
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="product-description">Mô tả</Label><Textarea id="product-description" rows={4} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></div>
            {editing && <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} /> Đang kinh doanh</label>}
            <section className="space-y-3 rounded-lg border p-3 sm:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-medium">Biến thể size / màu</h3>
                  <p className="text-xs text-muted-foreground">Tồn kho tổng được tính từ các biến thể đang kinh doanh.</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => setForm((current) => ({
                  ...current,
                  variantsEnabled: true,
                  variants: [...current.variants, { sku: '', size: '', color: '', stock: '0', isActive: true }]
                }))}><Plus className="mr-1 h-4 w-4" /> Thêm biến thể</Button>
              </div>
              {form.variantsEnabled && form.variants.length === 0 && (
                <p className="text-sm text-muted-foreground">Chưa có biến thể. Lưu sẽ ngừng bán các biến thể hiện tại.</p>
              )}
              {form.variants.map((variant, index) => (
                <div key={variant.id ?? `new-${index}`} className="grid gap-2 rounded-md bg-muted/40 p-3 sm:grid-cols-2 lg:grid-cols-6">
                  <Input aria-label="SKU" placeholder="SKU" value={variant.sku} onChange={(event) => setForm((current) => ({
                    ...current,
                    variants: current.variants.map((entry, entryIndex) => entryIndex === index ? { ...entry, sku: event.target.value } : entry)
                  }))} />
                  <Input aria-label="Kích thước" placeholder="Size" value={variant.size} onChange={(event) => setForm((current) => ({
                    ...current,
                    variants: current.variants.map((entry, entryIndex) => entryIndex === index ? { ...entry, size: event.target.value } : entry)
                  }))} />
                  <Input aria-label="Màu sắc" placeholder="Màu" value={variant.color} onChange={(event) => setForm((current) => ({
                    ...current,
                    variants: current.variants.map((entry, entryIndex) => entryIndex === index ? { ...entry, color: event.target.value } : entry)
                  }))} />
                  <Input aria-label="Tồn kho biến thể" type="number" min="0" step="1" placeholder="Tồn kho" value={variant.stock} onChange={(event) => setForm((current) => ({
                    ...current,
                    variants: current.variants.map((entry, entryIndex) => entryIndex === index ? { ...entry, stock: event.target.value } : entry)
                  }))} />
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={variant.isActive} onChange={(event) => setForm((current) => ({
                    ...current,
                    variants: current.variants.map((entry, entryIndex) => entryIndex === index ? { ...entry, isActive: event.target.checked } : entry)
                  }))} /> Đang bán</label>
                  <Button type="button" variant="ghost" size="icon" aria-label="Xóa biến thể" onClick={() => setForm((current) => ({
                    ...current,
                    variants: current.variants.filter((_, entryIndex) => entryIndex !== index)
                  }))}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
            </section>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Hủy</Button>
            <Button onClick={() => void saveProduct()} disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu sản phẩm'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminProducts;
