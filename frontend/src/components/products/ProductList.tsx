import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from './ProductCard';
import { Product } from '@/types';
import { productService } from '@/services';
import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';

interface ProductListProps {
  products?: Product[];
  title?: string;
  showViewAll?: boolean;
  viewAllLink?: string;
  loading?: boolean;
  categoryId?: string;
  limit?: number;
}

const ProductList = ({
  products: initialProducts,
  title,
  showViewAll = false,
  viewAllLink = '/products',
  loading: initialLoading = false,
  categoryId,
  limit = 8
}: ProductListProps) => {
  const [products, setProducts] = useState<Product[]>(initialProducts || []);
  const [loading, setLoading] = useState(initialLoading);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    // If products are provided as props, use them
    if (initialProducts && initialProducts.length > 0) {
      setProducts(initialProducts);
      return;
    }

    // Otherwise, fetch products based on categoryId if provided
    const fetchProducts = async () => {
      setLoading(true);
      setError('');
      try {
        let data: Product[] = [];
        
        if (categoryId) {
          data = await productService.getProductsByCategory(categoryId);
        } else {
          data = await productService.getAllProducts();
        }
        
        setProducts(data.slice(0, limit));
      } catch (error) {
        setError((error as Error).message || 'Unable to load products.');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [initialProducts, categoryId, limit, retryCount]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="animate-pulse rounded-md bg-muted">
            <div className="h-64 w-full rounded-md bg-muted-foreground/10"></div>
            <div className="mt-3 space-y-2 p-2">
              <div className="h-4 w-3/4 rounded bg-muted-foreground/10"></div>
              <div className="h-3 w-1/2 rounded bg-muted-foreground/10"></div>
              <div className="h-4 w-1/4 rounded bg-muted-foreground/10"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="py-8 text-center">
        <p role={error ? 'alert' : undefined} className="text-sm text-muted-foreground">
          {error || 'No products found.'}
        </p>
        {error && <Button variant="link" onClick={() => setRetryCount((count) => count + 1)}>Try again</Button>}
      </div>
    );
  }

  return (
    <div>
      {(title || showViewAll) && (
        <div className="mb-6 flex items-center justify-between">
          {title && <h2 className="text-2xl font-medium">{title}</h2>}
          {showViewAll && (
            <Button variant="link" asChild>
              <Link to={viewAllLink} className="flex items-center text-beauty-600">
                View All <ChevronRight size={16} className="ml-1" />
              </Link>
            </Button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
};

export default ProductList;