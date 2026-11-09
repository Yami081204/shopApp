import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, ArrowUpRight, BadgePercent, PackageCheck, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import ProductCard from '@/components/products/ProductCard';
import { Button } from '@/components/ui/button';
import { categoryService, productService } from '@/services';
import { Category, Product } from '@/types';

const ProductSection = ({
  title,
  description,
  products,
  loading,
  link,
  emptyText
}: {
  title: string;
  description: string;
  products: Product[];
  loading: boolean;
  link?: string;
  emptyText: string;
}) => (
  <section className="container py-12 md:py-16">
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">YAMI Edit</p>
        <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </div>
      {link && (
        <Button asChild variant="ghost" className="gap-2">
          <Link to={link}>Xem tất cả <ArrowRight className="h-4 w-4" /></Link>
        </Button>
      )}
    </div>
    {loading ? (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="animate-pulse">
            <div className="aspect-[4/5] rounded-xl bg-muted" />
            <div className="mt-3 h-4 w-3/4 rounded bg-muted" />
            <div className="mt-2 h-4 w-1/3 rounded bg-muted" />
          </div>
        ))}
      </div>
    ) : products.length > 0 ? (
      <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4">
        {products.map((product) => <ProductCard key={product.id} product={product} />)}
      </div>
    ) : (
      <div className="rounded-xl border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">
        {emptyText}
      </div>
    )}
  </section>
);

const Index = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      productService.getAllProducts({ limit: 100, sort: 'newest' }),
      categoryService.getAllCategories()
    ]).then(([productData, categoryData]) => {
      if (!active) return;
      setProducts(productData);
      setCategories(categoryData);
      setLoadError(productData.length === 0
        ? 'Chưa có sản phẩm để giới thiệu. Vui lòng quay lại sau.'
        : null);
    }).catch((error: unknown) => {
      if (!active) return;
      setLoadError((error as Error).message || 'Không thể tải dữ liệu cửa hàng.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const newest = useMemo(() => [...products].sort((a, b) =>
    new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  ).slice(0, 4), [products]);
  const popular = useMemo(() => [...products].sort((a, b) =>
    Number(b.rating || 0) - Number(a.rating || 0)
  ).slice(0, 4), [products]);
  const discounted = useMemo(() => products.filter((product) =>
    Number(product.discountPercent || 0) > 0
  ).slice(0, 4), [products]);
  const heroProduct = popular[0] || newest[0];

  return (
    <div>
      <section className="container py-6 md:py-10">
        <div className="relative isolate min-h-[440px] overflow-hidden rounded-2xl bg-neutral-100 md:min-h-[560px]">
          {heroProduct?.image && (
            <img
              src={heroProduct.image}
              alt={heroProduct.name}
              className="absolute inset-0 -z-20 h-full w-full object-cover object-center"
            />
          )}
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/70 via-black/40 to-black/5" />
          <div className="flex min-h-[440px] max-w-2xl flex-col items-start justify-center px-6 py-12 text-white sm:px-10 md:min-h-[560px] md:px-16">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-white/75">Bộ sưu tập ZaidepYamiFashion</p>
            <h1 className="max-w-xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl md:text-6xl">
              Những món đồ bạn sẽ muốn mặc lại.
            </h1>
            <p className="mt-5 max-w-lg text-sm leading-6 text-white/80 sm:text-base">
              Khám phá lựa chọn thời trang được tuyển chọn từ danh mục sản phẩm hiện có của chúng tôi.
            </p>
            <Button asChild size="lg" className="mt-8 gap-2 bg-white text-neutral-900 hover:bg-white/90">
              <Link to="/products">Khám phá sản phẩm <ArrowUpRight className="h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="container py-10">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Khám phá</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">Danh mục sản phẩm</h2>
          </div>
          <Link to="/products" className="text-sm font-medium underline underline-offset-4">Tất cả danh mục</Link>
        </div>
        {loading ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-24 animate-pulse rounded-xl bg-muted" />)}
          </div>
        ) : categories.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {categories.slice(0, 8).map((category) => (
              <Link
                key={category.id}
                to={`/products?category=${category.id}`}
                className="group flex min-h-24 items-center justify-between rounded-xl border bg-white p-4 transition-colors hover:bg-muted/50"
              >
                <span>
                  <span className="block font-medium">{category.name}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">{category.count || 0} sản phẩm</span>
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
              </Link>
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
            Danh mục sẽ xuất hiện khi có dữ liệu từ cửa hàng.
          </p>
        )}
      </section>

      {loadError && (
        <div role="alert" className="container py-4 text-sm text-destructive">{loadError}</div>
      )}

      <ProductSection
        title="Được yêu thích"
        description="Sản phẩm có điểm đánh giá cao từ dữ liệu cửa hàng."
        products={popular}
        loading={loading}
        link="/products?sort=popular"
        emptyText="Chưa có sản phẩm nổi bật."
      />
      <ProductSection
        title="Hàng mới về"
        description="Cập nhật mới nhất trong danh mục sản phẩm."
        products={newest}
        loading={loading}
        link="/products?sort=newest"
        emptyText="Chưa có sản phẩm mới."
      />
      <ProductSection
        title="Ưu đãi hiện có"
        description="Chỉ hiển thị ưu đãi được cung cấp từ dữ liệu sản phẩm."
        products={discounted}
        loading={loading}
        link={discounted.length ? '/products' : undefined}
        emptyText="Hiện chưa có dữ liệu giá khuyến mãi."
      />

      <section className="border-y bg-muted/40">
        <div className="container grid gap-6 py-9 sm:grid-cols-3">
          <div className="flex items-center gap-3"><PackageCheck className="h-5 w-5" /><span className="text-sm font-medium">Theo dõi đơn hàng dễ dàng</span></div>
          <div className="flex items-center gap-3"><ShieldCheck className="h-5 w-5" /><span className="text-sm font-medium">Thanh toán được xác nhận an toàn</span></div>
          <div className="flex items-center gap-3"><BadgePercent className="h-5 w-5" /><span className="text-sm font-medium">Giá và tồn kho từ hệ thống</span></div>
        </div>
      </section>
    </div>
  );
};

export default Index;
