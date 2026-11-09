import { Heart, ShoppingBag, Star } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAllContexts } from '@/hooks/useAllContexts';
import { Product } from '@/types';

interface ProductCardProps {
  product: Product;
}

const formatPrice = (value: number) => new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0
}).format(value);

const ProductCard = ({ product }: ProductCardProps) => {
  const navigate = useNavigate();
  const { addToCart, isInWishlist, toggleWishlistItem, isCartLoading, isWishlistLoading } = useAllContexts();
  const stock = Number(product.countInStock ?? product.stock ?? 0);
  const discount = Number(product.discountPercent || 0);
  const price = Number(product.price);
  const discountedPrice = Number(product.salePrice ?? (price * (1 - discount / 100)));
  const wishlisted = isInWishlist(product.id);

  return (
    <article className="group min-w-0">
      <div className="relative overflow-hidden rounded-xl bg-muted">
        <Link to={`/products/${product.id}`} aria-label={`Xem ${product.name}`}>
          <img
            src={product.image || '/placeholder.svg'}
            alt={product.name}
            loading="lazy"
            className="aspect-[4/5] w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        </Link>
        {discount > 0 && (
          <Badge className="absolute left-3 top-3 bg-foreground text-background">
            -{discount}%
          </Badge>
        )}
        {product.isNew && (
          <Badge variant="secondary" className={`absolute left-3 ${discount > 0 ? 'top-11' : 'top-3'} bg-white`}>
            Mới
          </Badge>
        )}
        <Button
          type="button"
          size="icon"
          variant="secondary"
          aria-label={wishlisted ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}
          className="absolute right-3 top-3 h-9 w-9 rounded-full bg-white/95"
          disabled={isWishlistLoading}
          onClick={() => void toggleWishlistItem(product)}
        >
          <Heart className={`h-4 w-4 ${wishlisted ? 'fill-rose-600 text-rose-600' : ''}`} />
        </Button>
        <Button
          type="button"
          size="sm"
          className="absolute bottom-3 left-3 right-3 opacity-100 sm:translate-y-2 sm:opacity-0 sm:transition-all sm:group-hover:translate-y-0 sm:group-hover:opacity-100"
          disabled={stock < 1 || isCartLoading}
          onClick={() => {
            if (product.variants?.some((variant) => variant.isActive)) {
              navigate(`/products/${product.id}`);
              return;
            }
            void addToCart(product, 1).catch(() => undefined);
          }}
        >
          <ShoppingBag className="mr-2 h-4 w-4" />
          {stock > 0 ? (product.variants?.some((variant) => variant.isActive) ? 'Chọn tùy chọn' : 'Thêm vào giỏ') : 'Hết hàng'}
        </Button>
      </div>
      <div className="space-y-1.5 pt-3">
        {product.category?.name && (
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {product.category.name}
          </p>
        )}
        <Link to={`/products/${product.id}`} className="block font-medium leading-snug hover:underline">
          {product.name}
        </Link>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          <span>{Number(product.rating || 0).toFixed(1)}</span>
          <span>({Number(product.numReviews || 0)})</span>
        </div>
        <div className="flex flex-wrap items-baseline gap-2 pt-0.5">
          <span className="font-semibold">{formatPrice(discountedPrice)}</span>
          {discount > 0 && (
            <span className="text-sm text-muted-foreground line-through">{formatPrice(price)}</span>
          )}
        </div>
      </div>
    </article>
  );
};

export default ProductCard;
