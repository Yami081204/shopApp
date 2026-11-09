import { FormEvent, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PackageSearch, Search, SlidersHorizontal, X } from 'lucide-react';
import ProductCard from '@/components/products/ProductCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { categoryService, ProductPage, productService } from '@/services';
import { Category } from '@/types';

const PAGE_SIZE = 12;

const Products = () => {
  const [params, setParams] = useSearchParams();
  const [pageData, setPageData] = useState<ProductPage>({ rows: [], count: 0, page: 1, limit: PAGE_SIZE });
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryError, setCategoryError] = useState('');
  const [searchText, setSearchText] = useState(params.get('search') || '');
  const [search, setSearch] = useState(params.get('search') || '');
  const [category, setCategory] = useState(params.get('category') || '');
  const [minPrice, setMinPrice] = useState(params.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(params.get('maxPrice') || '');
  const [size, setSize] = useState(params.get('size') || '');
  const [color, setColor] = useState(params.get('color') || '');
  const [sort, setSort] = useState(params.get('sort') || 'newest');
  const [page, setPage] = useState(Number(params.get('page')) || 1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    let active = true;
    categoryService.getAllCategories().then((items) => {
      if (active) {
        setCategories(items);
        setCategoryError('');
      }
    }).catch((requestError: unknown) => {
      if (active) setCategoryError((requestError as Error).message || 'Không thể tải danh mục.');
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    productService.getProductsPage({
      search: search || undefined,
      category: category || undefined,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      size: size || undefined,
      color: color || undefined,
      sort,
      page,
      limit: PAGE_SIZE
    }).then((result) => {
      if (active) setPageData(result);
    }).catch((requestError: unknown) => {
      if (active) setError((requestError as Error).message || 'Không thể tải sản phẩm.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [search, category, minPrice, maxPrice, size, color, sort, page, retryCount]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (search) next.set('search', search);
    if (category) next.set('category', category);
    if (minPrice) next.set('minPrice', minPrice);
    if (maxPrice) next.set('maxPrice', maxPrice);
    if (size) next.set('size', size);
    if (color) next.set('color', color);
    if (sort !== 'newest') next.set('sort', sort);
    if (page > 1) next.set('page', String(page));
    setParams(next, { replace: true });
  }, [search, category, minPrice, maxPrice, size, color, sort, page, setParams]);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchText.trim());
  };

  const clearFilters = () => {
    setSearchText('');
    setSearch('');
    setCategory('');
    setMinPrice('');
    setMaxPrice('');
    setSize('');
    setColor('');
    setSort('newest');
    setPage(1);
  };

  const pageCount = Math.max(1, Math.ceil(pageData.count / PAGE_SIZE));

  return (
    <div className="container min-h-[65vh] py-8 md:py-12">
      <header className="mb-8 border-b pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">ZaidepYamiFashion collection</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">Tất cả sản phẩm</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Tìm kiếm và lọc sản phẩm theo danh mục, khoảng giá và thứ tự hiển thị.
        </p>
      </header>

      <div className="mb-6 flex flex-col gap-3 md:flex-row">
        <form onSubmit={submitSearch} className="flex flex-1 gap-2">
          <Input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Tìm tên sản phẩm..."
            aria-label="Tìm sản phẩm"
          />
          <Button type="submit" aria-label="Tìm kiếm"><Search className="h-4 w-4" /></Button>
        </form>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="md:hidden"
            onClick={() => setMobileFiltersOpen((open) => !open)}
          >
            <SlidersHorizontal className="mr-2 h-4 w-4" /> Bộ lọc
          </Button>
          <select
            value={sort}
            onChange={(event) => { setSort(event.target.value); setPage(1); }}
            className="h-10 rounded-md border bg-background px-3 text-sm"
            aria-label="Sắp xếp sản phẩm"
          >
            <option value="newest">Mới nhất</option>
            <option value="popular">Đánh giá cao</option>
            <option value="price-asc">Giá: thấp đến cao</option>
            <option value="price-desc">Giá: cao đến thấp</option>
          </select>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-[220px_minmax(0,1fr)]">
        <aside className={`${mobileFiltersOpen ? 'block' : 'hidden'} h-fit rounded-xl border p-4 md:block`}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Bộ lọc</h2>
            <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
              <X className="mr-1 h-4 w-4" /> Xóa
            </Button>
          </div>
          <label htmlFor="category-filter" className="mb-2 block text-sm font-medium">Danh mục</label>
          {categoryError && <p role="status" className="mb-2 text-xs text-destructive">{categoryError}</p>}
          <select
            id="category-filter"
            value={category}
            onChange={(event) => { setCategory(event.target.value); setPage(1); }}
            className="mb-5 h-10 w-full rounded-md border bg-background px-3 text-sm"
          >
            <option value="">Tất cả danh mục</option>
            {categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <p className="mb-2 text-sm font-medium">Khoảng giá (VND)</p>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              min="0"
              value={minPrice}
              onChange={(event) => { setMinPrice(event.target.value); setPage(1); }}
              placeholder="Từ"
              aria-label="Giá thấp nhất"
            />
            <Input
              type="number"
              min="0"
              value={maxPrice}
              onChange={(event) => { setMaxPrice(event.target.value); setPage(1); }}
              placeholder="Đến"
              aria-label="Giá cao nhất"
            />
          </div>
          <label htmlFor="size-filter" className="mb-2 mt-5 block text-sm font-medium">Kích thước</label>
          <select
            id="size-filter"
            value={size}
            onChange={(event) => { setSize(event.target.value); setPage(1); }}
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
          >
            <option value="">Tất cả kích thước</option>
            {['XS', 'S', 'M', 'L', 'XL', 'XXL', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', 'FREESIZE'].map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
          <label htmlFor="color-filter" className="mb-2 mt-5 block text-sm font-medium">Màu sắc</label>
          <Input
            id="color-filter"
            value={color}
            onChange={(event) => { setColor(event.target.value); setPage(1); }}
            placeholder="Ví dụ: đen"
            maxLength={64}
          />
        </aside>

        <section aria-live="polite">
          <div className="mb-4 text-sm text-muted-foreground">
            {loading ? 'Đang tải sản phẩm...' : `${pageData.count} sản phẩm`}
          </div>
          {error && (
            <div role="alert" className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              {error}
              <Button variant="link" className="ml-2 p-0" onClick={() => setRetryCount((value) => value + 1)}>Thử lại</Button>
            </div>
          )}
          {loading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {Array.from({ length: 6 }, (_, index) => (
                <div key={index} className="animate-pulse">
                  <div className="aspect-[4/5] rounded-xl bg-muted" />
                  <div className="mt-3 h-4 rounded bg-muted" />
                  <div className="mt-2 h-4 w-1/2 rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : pageData.rows.length > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-6">
                {pageData.rows.map((product) => <ProductCard key={product.id} product={product} />)}
              </div>
              <div className="mt-10 flex items-center justify-center gap-4">
                <Button variant="outline" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Trước</Button>
                <span className="text-sm text-muted-foreground">Trang {page} / {pageCount}</span>
                <Button variant="outline" disabled={page >= pageCount} onClick={() => setPage((value) => value + 1)}>Tiếp</Button>
              </div>
            </>
          ) : !error ? (
            <div className="rounded-xl border border-dashed py-16 text-center">
              <PackageSearch className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
              <h2 className="font-medium">Không tìm thấy sản phẩm</h2>
              <p className="mt-1 text-sm text-muted-foreground">Thử đổi từ khóa hoặc xóa một số bộ lọc.</p>
              <Button variant="outline" className="mt-5" onClick={clearFilters}>Xóa bộ lọc</Button>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
};

export default Products;
