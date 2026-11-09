import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Heart, Minus, Plus, ShieldCheck, ShoppingBag, Star, Truck } from 'lucide-react';
import ProductCard from '@/components/products/ProductCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAllContexts } from '@/hooks/useAllContexts';
import { useToast } from '@/hooks/use-toast';
import { productService } from '@/services';
import { Product } from '@/types';

const currency = (amount: number) => new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0
}).format(amount);

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { addToCart, isInWishlist, toggleWishlistItem, isCartLoading, isWishlistLoading } = useAllContexts();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [relatedError, setRelatedError] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setRelatedError('');
    setProduct(null);
    setRelated([]);
    setSelectedSize('');
    setSelectedColor('');
    productService.getProductById(Number(id)).then(async (item) => {
      if (!item) throw new Error('Không tìm thấy sản phẩm.');
      if (!active) return;
      setProduct(item);
      try {
        const relatedItems = await productService.getProductsByCategory(item.categoryId);
        if (active) setRelated(relatedItems.filter((other) => other.id !== item.id).slice(0, 4));
      } catch {
        if (active) setRelatedError('Không thể tải sản phẩm cùng danh mục.');
      }
    }).catch((requestError: unknown) => {
      if (active) setError((requestError as Error).message || 'Không thể tải sản phẩm.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [id]);

  const addItem = async (buyNow: boolean) => {
    if (!product) return;
    if (product.variants?.length && !selectedVariant) {
      toast({
        title: 'Chọn màu và kích thước',
        description: 'Vui lòng chọn biến thể còn hàng trước khi thêm vào giỏ.',
        variant: 'destructive'
      });
      return;
    }
    try {
      await addToCart(product, quantity, selectedVariant?.id);
      if (buyNow) navigate('/checkout');
    } catch (requestError) {
      toast({
        title: 'Không thể thêm sản phẩm',
        description: (requestError as Error).message,
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <div className="container grid min-h-[60vh] animate-pulse gap-8 py-10 md:grid-cols-2">
        <div className="aspect-[4/5] rounded-xl bg-muted" />
        <div className="space-y-4 py-8"><div className="h-6 w-1/3 rounded bg-muted" /><div className="h-10 rounded bg-muted" /><div className="h-5 w-1/2 rounded bg-muted" /></div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
        <h1 className="text-2xl font-semibold">Không thể mở sản phẩm</h1>
        <p role="alert" className="mt-2 text-sm text-muted-foreground">{error || 'Sản phẩm không tồn tại.'}</p>
        <Button asChild className="mt-5"><Link to="/products">Quay lại sản phẩm</Link></Button>
      </div>
    );
  }

  const variants = (product.variants || []).filter((variant) => variant.isActive);
  const availableVariants = variants.filter((variant) => Number(variant.stock) > 0);
  const colors = [...new Set(availableVariants.map((variant) => variant.color))];
  const sizes = [...new Set(availableVariants
    .filter((variant) => !selectedColor || variant.color === selectedColor)
    .map((variant) => variant.size))];
  const selectedVariant = variants.find((variant) =>
    variant.color === selectedColor && variant.size === selectedSize
  );
  const stock = variants.length
    ? Number(selectedVariant?.stock ?? 0)
    : Number(product.countInStock ?? product.stock ?? 0);
  const displayedPrice = Number(product.salePrice ?? product.price);
  const discount = product.salePrice
    ? Math.round((1 - Number(product.salePrice) / Number(product.price)) * 100)
    : Number(product.discountPercent || 0);
  const wishlisted = isInWishlist(product.id);

  return (
    <div className="container py-6 md:py-10">
      <Link to="/products" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Tất cả sản phẩm
      </Link>
      <div className="grid gap-8 md:grid-cols-2 md:gap-12">
        <div className="overflow-hidden rounded-2xl bg-muted">
          <img
            src={product.image || '/placeholder.svg'}
            alt={product.name}
            className="aspect-[4/5] w-full object-cover"
          />
          {selectedVariant && (
            <p className="border-t bg-white px-4 py-3 text-xs text-muted-foreground">
              SKU: {selectedVariant.sku}
            </p>
          )}
        </div>
        <div className="flex flex-col py-2 md:py-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {product.category?.name || 'YAMI'}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">{product.name}</h1>
          <div className="mt-4 flex items-center gap-2 text-sm">
            <span className="flex items-center gap-1"><Star className="h-4 w-4 fill-amber-400 text-amber-400" />{Number(product.rating || 0).toFixed(1)}</span>
            <span className="text-muted-foreground">· {Number(product.numReviews || 0)} đánh giá</span>
          </div>

          <div className="mt-6 flex items-baseline gap-3">
            <span className="text-2xl font-semibold">{currency(displayedPrice)}</span>
            {discount > 0 && (
              <>
                <span className="text-muted-foreground line-through">{currency(Number(product.price))}</span>
                <Badge variant="secondary">-{discount}%</Badge>
              </>
            )}
          </div>
          <div className="mt-4">
            {variants.length > 0 && availableVariants.length === 0
              ? <span className="text-sm text-destructive">Tạm hết hàng</span>
              : variants.length > 0 && !selectedVariant
                ? <span className="text-sm text-muted-foreground">Chọn màu và kích thước để xem tồn kho</span>
                : stock > 0
              ? <span className="text-sm text-emerald-700">Còn hàng · {stock} sản phẩm</span>
              : <span className="text-sm text-destructive">Tạm hết hàng</span>}
          </div>
          {variants.length > 0 && (
            <div className="mt-6 space-y-5">
              <div>
                <p className="mb-2 text-sm font-medium">Màu sắc: {selectedColor || 'Chọn màu'}</p>
                <div className="flex flex-wrap gap-2">
                  {colors.map((color) => (
                    <Button
                      key={color}
                      type="button"
                      size="sm"
                      variant={selectedColor === color ? 'default' : 'outline'}
                      onClick={() => {
                        setSelectedColor(color);
                        const nextSize = availableVariants.find((variant) => variant.color === color)?.size || '';
                        setSelectedSize(nextSize);
                        setQuantity(1);
                      }}
                    >
                      {color}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium">Kích thước: {selectedSize || 'Chọn size'}</p>
                <div className="flex flex-wrap gap-2">
                  {sizes.map((size) => {
                    const variant = variants.find((item) => item.color === selectedColor && item.size === size);
                    return (
                      <Button
                        key={size}
                        type="button"
                        size="sm"
                        variant={selectedSize === size ? 'default' : 'outline'}
                        disabled={!variant || variant.stock < 1}
                        onClick={() => {
                          setSelectedSize(size);
                          setQuantity(1);
                        }}
                      >
                        {size}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          <p className="mt-6 whitespace-pre-line text-sm leading-7 text-muted-foreground">
            {product.description || 'Thông tin mô tả chưa được cập nhật.'}
          </p>

          <div className="mt-8">
            <label htmlFor="product-quantity" className="mb-2 block text-sm font-medium">Số lượng</label>
            <div className="flex h-10 w-fit items-center rounded-md border">
              <Button type="button" size="icon" variant="ghost" aria-label="Giảm số lượng" disabled={quantity <= 1} onClick={() => setQuantity((value) => Math.max(1, value - 1))}>
                <Minus className="h-4 w-4" />
              </Button>
              <input
                id="product-quantity"
                type="number"
                min={1}
                max={Math.max(stock, 1)}
                value={quantity}
                onChange={(event) => setQuantity(Math.min(Math.max(1, Number(event.target.value) || 1), Math.max(stock, 1)))}
                className="w-12 bg-transparent text-center text-sm outline-none"
              />
              <Button type="button" size="icon" variant="ghost" aria-label="Tăng số lượng" disabled={quantity >= stock} onClick={() => setQuantity((value) => Math.min(stock, value + 1))}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-[1fr_auto] gap-3">
            <Button size="lg" disabled={stock < 1 || isCartLoading || (variants.length > 0 && !selectedVariant)} onClick={() => void addItem(false)}>
              <ShoppingBag className="mr-2 h-4 w-4" /> Thêm vào giỏ
            </Button>
            <Button
              size="lg"
              variant="outline"
              aria-label={wishlisted ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}
              disabled={isWishlistLoading}
              onClick={() => void toggleWishlistItem(product)}
            >
              <Heart className={wishlisted ? 'fill-rose-600 text-rose-600' : ''} />
            </Button>
          </div>
          <Button className="mt-3 w-full" size="lg" variant="secondary" disabled={stock < 1 || isCartLoading || (variants.length > 0 && !selectedVariant)} onClick={() => void addItem(true)}>
            Mua ngay
          </Button>

          <div className="mt-8 grid gap-3 border-t pt-5 text-sm sm:grid-cols-2">
            <div className="flex items-center gap-2"><Truck className="h-4 w-4 text-muted-foreground" />Giao hàng toàn quốc</div>
            <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-muted-foreground" />Thanh toán được xác nhận an toàn</div>
          </div>
        </div>
      </div>

      <section className="mt-14 border-t pt-8">
        <h2 className="text-xl font-semibold">Đánh giá sản phẩm</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Điểm trung bình {Number(product.rating || 0).toFixed(1)} từ {Number(product.numReviews || 0)} đánh giá.
          Danh sách và gửi đánh giá sẽ hiển thị khi dịch vụ review được triển khai.
        </p>
      </section>

      {relatedError && <p role="status" className="mt-8 border-t pt-6 text-sm text-muted-foreground">{relatedError}</p>}
      {related.length > 0 && (
        <section className="mt-14 border-t pt-8">
          <h2 className="mb-6 text-xl font-semibold">Sản phẩm cùng danh mục</h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
            {related.map((item) => <ProductCard key={item.id} product={item} />)}
          </div>
        </section>
      )}
    </div>
  );
};

export default ProductDetail;
