import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Heart, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAllContexts } from "@/hooks/useAllContexts";
import ProductCard from "@/components/products/ProductCard";

const Wishlist = () => {
  const { wishlist, isAuthLoading } = useAllContexts();

  if (isAuthLoading) {
    return (
      <>
        <div className="container py-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-beauty-600 border-t-transparent mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading wishlist...</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (wishlist.length === 0) {
    return (
      <>
        <div className="container py-8">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Heart size={64} className="mb-6 text-muted-foreground" />
            <h2 className="mb-2 text-xl font-medium">No favorite products</h2>
            <p className="mb-8 text-muted-foreground">
              You haven't added any products to your wishlist
            </p>
            <Button asChild variant="default">
              <Link to="/products">Explore products</Link>
            </Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="container py-8">
        <h1 className="mb-8 text-2xl font-bold">Your wishlist</h1>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {wishlist.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </>
  );
};

export default Wishlist;
