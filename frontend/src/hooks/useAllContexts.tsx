import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Product, CartItem } from '@/types';
import { toast } from "@/hooks/use-toast";
import { userService } from '@/services/userService';
import { cartService } from '@/services/cartService';

// Auth Context Props
interface AuthContextProps {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  updateCurrentUser: (updates: Partial<User>) => void;
  logout: () => Promise<void>;
  isAuthLoading: boolean;
}

// Cart Context Props
interface CartContextProps {
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number, variantId?: number) => Promise<void>;
  removeFromCart: (productId: number, variantId?: number) => Promise<boolean>;
  updateQuantity: (productId: number, quantity: number, variantId?: number) => Promise<boolean>;
  clearCart: () => Promise<boolean>;
  getCartTotal: () => number;
  getCartCount: () => number;
  isCartLoading: boolean;
  cartError: string | null;
}

// Wishlist Context Props
interface WishlistContextProps {
  wishlist: Product[];
  addToWishlist: (product: Product) => Promise<void>;
  removeFromWishlist: (productId: number) => Promise<void>;
  toggleWishlistItem: (product: Product) => Promise<void>;
  isInWishlist: (productId: number) => boolean;
  clearWishlist: () => Promise<void>;
  isWishlistLoading: boolean;
}

// Combined Context Props
interface AllContextsProps extends AuthContextProps, CartContextProps, WishlistContextProps {}

const AllContextsContext = createContext<AllContextsProps | undefined>(undefined);
const getCartItemVariantId = (item: CartItem) => item.variantId ?? item.variationId;

export const AllContextsProvider = ({ children }: { children: ReactNode }) => {
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const updateCurrentUser = (updates: Partial<User>) => {
    if (!user) return;
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartLoading, setIsCartLoading] = useState(false);
  const [cartError, setCartError] = useState<string | null>(null);

  // Wishlist state
  const [wishlist, setWishlist] = useState<Product[]>([]);
  const [isWishlistLoading, setIsWishlistLoading] = useState(false);

  // Auth: Load user from localStorage and validate with backend
  useEffect(() => {
    const checkAuthStatus = async () => {
      setIsAuthLoading(true);
      const savedUser = localStorage.getItem('user');
      
      if (savedUser && savedUser !== 'undefined') {
        try {
          const parsedUser = JSON.parse(savedUser);
          setUser(parsedUser);
          setIsAuthenticated(true);
          
          // Validate token by fetching user profile
          try {
            const profile = await userService.getUserProfile();
            if (profile) {
              // Cập nhật thông tin user nếu có thay đổi từ server
              setUser(profile);
            }
          } catch {
            // Token không hợp lệ hoặc hết hạn
            setUser(null);
            setIsAuthenticated(false);
            localStorage.removeItem('user');
            localStorage.removeItem('auth_token');
          }
        } catch (e) {
          console.error('Failed to parse user from localStorage:', e);
          // Clean up invalid data
          localStorage.removeItem('user');
          localStorage.removeItem('auth_token');
        }
      }
      setIsAuthLoading(false);
    };
    
    checkAuthStatus();
  }, []);

  // Auth: Login method
  const login = async (email: string, password: string) => {
    try {
      setIsAuthLoading(true);
      const response = await userService.login(email, password);
      if (response?.user) {
        setCart([]);
        setCartError(null);
        setUser(response.user);
        setIsAuthenticated(true);
        return Promise.resolve();
      } else {
        console.error("useAllContexts: Phản hồi đăng nhập không hợp lệ.");
        return Promise.reject(new Error("Đăng nhập thất bại. Vui lòng kiểm tra thông tin đăng nhập của bạn."));
      }
    } catch (error) {
      return Promise.reject(error);
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Auth: Register method
  const register = async (name: string, email: string, password: string) => {
    try {
      const response = await userService.register(name, email, password);
      
      if (response && response.user) {
        setCart([]);
        setCartError(null);
        setUser(response.user);
        setIsAuthenticated(true);
        return Promise.resolve();
      } else {
        throw new Error("Đăng ký thất bại. Vui lòng thử lại.");
      }
    } catch (error: unknown) {
      return Promise.reject(error);
    }
  };

  // Auth: Logout method
  const logout = async () => {
    setUser(null);
    setIsAuthenticated(false);
    setCart([]);
    setCartError(null);
    const revoked = await userService.logout();
    toast(revoked
      ? {
        title: "Đã đăng xuất",
        description: "Phiên đăng nhập đã được thu hồi."
      }
      : {
        title: "Đã đăng xuất trên thiết bị",
        description: "Không thể liên hệ máy chủ để thu hồi token. Hãy đăng xuất lại khi kết nối được khôi phục.",
        variant: "destructive"
      });
  };

  // Cart: Load cart on auth change
  useEffect(() => {
    let active = true;
    const loadCart = async () => {
      if (isAuthLoading) return;
      setIsCartLoading(true);
      setCartError(null);
      
      if (isAuthenticated) {
        localStorage.removeItem('cart');
        localStorage.removeItem('guest_cart');
        try {
          const cartItems = await cartService.getCart();
          if (!active) return;
          setCartError(null);
          setCart(cartItems);
        } catch {
          if (!active) return;
          setCart([]);
          setCartError('Không thể tải giỏ hàng từ máy chủ. Vui lòng thử lại sau.');
        } finally {
          if (active) setIsCartLoading(false);
        }
        return;
      }

      try {
        const savedCart = localStorage.getItem('guest_cart');
        if (savedCart) {
          setCart(JSON.parse(savedCart));
        } else {
          setCart([]);
        }
      } catch (error) {
        console.error('Lỗi khi đọc giỏ hàng khách từ localStorage:', error);
        setCart([]);
        setCartError('Không thể đọc giỏ hàng khách đã lưu.');
      } finally {
        localStorage.removeItem('cart');
        if (active) setIsCartLoading(false);
      }
    };

    void loadCart();
    return () => {
      active = false;
    };
  }, [isAuthenticated, isAuthLoading, user]);

  // Persist only the guest cart; each signed-in account uses its server-side cart.
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      localStorage.setItem('guest_cart', JSON.stringify(cart));
    }
  }, [cart, isAuthenticated, isAuthLoading]);

  // Cart: Add to cart method
  const addToCart = async (product: Product, quantity = 1, variantId?: number): Promise<void> => {
    try {
      setIsCartLoading(true);
      setCartError(null);
      
      // Kiểm tra sản phẩm đã có trong giỏ hàng chưa
      const existingItemIndex = cart.findIndex(
        item => item.productId === product.id && getCartItemVariantId(item) === variantId
      );

      let updatedCart;
      
      if (existingItemIndex !== -1) {
        // Cập nhật số lượng nếu sản phẩm đã tồn tại
        const newQuantity = cart[existingItemIndex].quantity + quantity;
        // Cập nhật lên backend nếu đã đăng nhập
        if (isAuthenticated) {
          const existingItem = cart[existingItemIndex];
          if (!existingItem.id) {
            throw new Error('Không tìm thấy mã sản phẩm trong giỏ hàng trên máy chủ.');
          }
          const updatedItem = await cartService.updateCartItem(existingItem.id, newQuantity);
          updatedCart = [...cart];
          updatedCart[existingItemIndex] = { ...updatedItem, product: updatedItem.product || product };
        } else {
          updatedCart = [...cart];
          updatedCart[existingItemIndex] = { ...updatedCart[existingItemIndex], quantity: newQuantity };
        }
        
        toast({
          title: "Cart updated",
          description: `Quantity of ${product.name} has been updated`,
        });
      } else {
        // Thêm mới nếu sản phẩm chưa có trong giỏ hàng
        // Thêm lên backend nếu đã đăng nhập
        if (isAuthenticated) {
          const cartItemResponse = await cartService.addToCart(product.id, quantity, variantId);
          updatedCart = [...cart, { ...cartItemResponse, product: cartItemResponse.product || product }];
        } else {
          const newItem: CartItem = { productId: product.id, product, quantity, variantId };
          updatedCart = [...cart, newItem];
        }
        
        toast({
          title: "Added to cart",
          description: `${product.name} has been added to your cart`,
        });
      }
      
      setCart(updatedCart);
      return Promise.resolve();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Could not add product to cart",
        variant: "destructive"
      });
      return Promise.reject(error);
    } finally {
      setIsCartLoading(false);
    }
  };

  // Cart: Remove from cart method
  const removeFromCart = async (productId: number, variantId?: number) => {
    try {
      setIsCartLoading(true);
      setCartError(null);
      
      // Tìm cart item để lấy ID
      const cartItem = cart.find(item => 
        item.productId === productId && getCartItemVariantId(item) === variantId
      );
      
      // Xóa khỏi backend nếu đã đăng nhập
      if (isAuthenticated) {
        if (!cartItem?.id) {
          throw new Error('Không tìm thấy mã sản phẩm trong giỏ hàng trên máy chủ.');
        }
        await cartService.removeFromCart(cartItem.id);
      }
      setCart(prevCart => prevCart.filter(item =>
        !(item.productId === productId && getCartItemVariantId(item) === variantId)
      ));
      
      toast({
        title: "Removed from cart",
        description: "Product has been removed from your cart",
      });
    } catch (error) {
      toast({
        title: "Không thể xóa sản phẩm",
        description: error instanceof Error ? error.message : "Vui lòng thử lại.",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsCartLoading(false);
    }
    return true;
  };

  // Cart: Update quantity method
  const updateQuantity = async (productId: number, quantity: number, variantId?: number) => {
    try {
      setIsCartLoading(true);
      setCartError(null);
      
      if (quantity < 1) return false;
      
      // Cập nhật lên backend nếu đã đăng nhập
      if (isAuthenticated) {
        const cartItem = cart.find(item =>
          item.productId === productId && getCartItemVariantId(item) === variantId
        );
        if (!cartItem?.id) {
          throw new Error('Không tìm thấy mã sản phẩm trong giỏ hàng trên máy chủ.');
        }
        const updatedItem = await cartService.updateCartItem(cartItem.id, quantity);
        setCart(prevCart => prevCart.map(item =>
          item.productId === productId && getCartItemVariantId(item) === variantId
            ? { ...updatedItem, product: updatedItem.product || item.product }
            : item
        ));
      } else {
        setCart(prevCart => prevCart.map(item =>
          item.productId === productId && getCartItemVariantId(item) === variantId
            ? { ...item, quantity }
            : item
        ));
      }
    } catch (error) {
      toast({
        title: "Không thể cập nhật số lượng",
        description: error instanceof Error ? error.message : "Vui lòng thử lại.",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsCartLoading(false);
    }
    return true;
  };

  // Cart: Clear cart method
  const clearCart = async () => {
    try {
      setIsCartLoading(true);
      setCartError(null);
      
      // Xóa trên backend trước nếu đã đăng nhập
      if (isAuthenticated) {
        await cartService.clearCart();
      }
      
      // Xóa state local
      setCart([]);
      
      toast({
        title: "Cart cleared",
        description: "All products have been removed from your cart",
      });
    } catch (error) {
      toast({
        title: "Không thể xóa giỏ hàng",
        description: error instanceof Error ? error.message : "Vui lòng thử lại.",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsCartLoading(false);
    }
    return true;
  };

  // Cart: Get cart total method
  const getCartTotal = () => {
    return cart.reduce((total, item) => {
      // Đảm bảo price là số
      const finalPrice = Number(item.product.salePrice ?? item.product.price ?? 0);
      return total + finalPrice * item.quantity;
    }, 0);
  };

  // Cart: Get cart count method
  const getCartCount = () => {
    return cart.reduce((count, item) => count + item.quantity, 0);
  };

  // Wishlist: Tải danh sách yêu thích từ localStorage
  useEffect(() => {
    const savedWishlist = localStorage.getItem('wishlist');
    if (savedWishlist) {
      try {
        setWishlist(JSON.parse(savedWishlist));
      } catch (e) {
        console.error('Lỗi khi đọc danh sách yêu thích từ localStorage:', e);
      }
    }
  }, []);

  // Wishlist: Lưu danh sách yêu thích vào localStorage khi có thay đổi
  useEffect(() => {
    localStorage.setItem('wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  // Wishlist: Add to wishlist method
  const addToWishlist = async (product: Product): Promise<void> => {
    try {
      setIsWishlistLoading(true);
      if (!isInWishlist(product.id)) {
        setWishlist(prev => [...prev, product]);
        toast({
          title: "Added to wishlist",
          description: `${product.name} has been added to your wishlist`,
        });
      }
      return Promise.resolve();
    } catch (error) {
      console.error('Lỗi khi thêm vào danh sách yêu thích:', error);
      toast({
        title: "Error",
        description: "Could not add product to wishlist",
        variant: "destructive"
      });
      return Promise.reject(error);
    } finally {
      setIsWishlistLoading(false);
    }
  };

  // Wishlist: Remove from wishlist method
  const removeFromWishlist = async (productId: number): Promise<void> => {
    try {
      setIsWishlistLoading(true);
      setWishlist(prev => prev.filter(item => item.id !== productId));
      toast({
        title: "Removed from wishlist",
        description: "Product has been removed from your wishlist",
      });
      return Promise.resolve();
    } catch (error) {
      console.error('Lỗi khi xóa khỏi danh sách yêu thích:', error);
      toast({
        title: "Error",
        description: "Could not remove product from wishlist",
        variant: "destructive"
      });
      return Promise.reject(error);
    } finally {
      setIsWishlistLoading(false);
    }
  };

  // Wishlist: Toggle wishlist item method
  const toggleWishlistItem = async (product: Product): Promise<void> => {
    try {
      if (isInWishlist(product.id)) {
        await removeFromWishlist(product.id);
      } else {
        await addToWishlist(product);
      }
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  };

  // Wishlist: Check if product is in wishlist
  const isInWishlist = (productId: number) => {
    return wishlist.some(item => item.id === productId);
  };

  // Wishlist: Clear wishlist method
  const clearWishlist = async (): Promise<void> => {
    try {
      setIsWishlistLoading(true);
      setWishlist([]);
      toast({
        title: "Wishlist cleared",
        description: "All products have been removed from your wishlist",
      });
      return Promise.resolve();
    } catch (error) {
      console.error('Lỗi khi xóa danh sách yêu thích:', error);
      toast({
        title: "Error",
        description: "Could not clear wishlist",
        variant: "destructive"
      });
      return Promise.reject(error);
    } finally {
      setIsWishlistLoading(false);
    }
  };

  return (
    <AllContextsContext.Provider
      value={{
        // Auth properties
        user,
        isAuthenticated,
        login,
        register,
        updateCurrentUser,
        logout,
        isAuthLoading,
        
        // Cart properties
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getCartTotal,
        getCartCount,
        isCartLoading,
        cartError,

        // Wishlist properties
        wishlist,
        addToWishlist,
        removeFromWishlist,
        toggleWishlistItem,
        isInWishlist,
        clearWishlist,
        isWishlistLoading
      }}
    >
      {children}
    </AllContextsContext.Provider>
  );
};

export const useAllContexts = () => {
  const context = useContext(AllContextsContext);
  if (context === undefined) {
    throw new Error('useAllContexts phải được sử dụng trong AllContextsProvider');
  }
  return context;
}; 