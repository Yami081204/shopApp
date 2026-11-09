import { FormEvent, useEffect, useState } from 'react';
import { Heart, LayoutDashboard, LogOut, Menu, Search, ShoppingBag, User, X } from 'lucide-react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAllContexts } from '@/hooks/useAllContexts';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const { wishlist, user, isAuthenticated, getCartCount, logout } = useAllContexts();
  const cartCount = getCartCount();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const searchProducts = (event: FormEvent) => {
    event.preventDefault();
    navigate(`/products${query.trim() ? `?search=${encodeURIComponent(query.trim())}` : ''}`);
    setMenuOpen(false);
  };

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium transition-colors hover:text-foreground ${isActive ? 'text-foreground' : 'text-muted-foreground'}`;

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="container">
        <div className="flex min-h-16 items-center gap-4">
          <Link to="/" className="shrink-0 text-lg font-bold tracking-tight">
            YAMI
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            <NavLink to="/" className={navClass}>Trang chủ</NavLink>
            <NavLink to="/products" className={navClass}>Sản phẩm</NavLink>
            <NavLink to="/about" className={navClass}>Giới thiệu</NavLink>
            <NavLink to="/contact" className={navClass}>Liên hệ</NavLink>
          </nav>

          <form onSubmit={searchProducts} className="ml-auto hidden max-w-xs flex-1 items-center md:flex">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tìm sản phẩm"
                aria-label="Tìm sản phẩm"
                className="h-10 w-full rounded-full border bg-muted/40 pl-9 pr-4 text-sm outline-none transition focus:border-foreground/30 focus:bg-background"
              />
            </div>
          </form>

          <div className="ml-auto flex items-center gap-1 md:ml-0">
            <Link to="/wishlist" aria-label="Danh sách yêu thích">
              <Button variant="ghost" size="icon" className="relative">
                <Heart className="h-5 w-5" />
                {wishlist.length > 0 && (
                  <Badge className="absolute -right-1 -top-1 h-5 min-w-5 justify-center rounded-full px-1 text-[10px]">
                    {wishlist.length}
                  </Badge>
                )}
              </Button>
            </Link>
            <Link to="/cart" aria-label="Giỏ hàng">
              <Button variant="ghost" size="icon" className="relative">
                <ShoppingBag className="h-5 w-5" />
                {cartCount > 0 && (
                  <Badge className="absolute -right-1 -top-1 h-5 min-w-5 justify-center rounded-full px-1 text-[10px]">
                    {cartCount}
                  </Badge>
                )}
              </Button>
            </Link>
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Tài khoản"><User className="h-5 w-5" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild><Link to="/profile"><User className="mr-2 h-4 w-4" />Tài khoản</Link></DropdownMenuItem>
                  {user?.isAdmin && (
                    <DropdownMenuItem asChild><Link to="/admin/dashboard"><LayoutDashboard className="mr-2 h-4 w-4" />Quản trị</Link></DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={logout}><LogOut className="mr-2 h-4 w-4" />Đăng xuất</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
                <Link to="/login">Đăng nhập</Link>
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {menuOpen && (
          <div className="border-t py-4 md:hidden">
            <form onSubmit={searchProducts} className="mb-4 flex gap-2">
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tìm sản phẩm"
                className="h-10 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm"
              />
              <Button type="submit" size="icon" aria-label="Tìm kiếm"><Search className="h-4 w-4" /></Button>
            </form>
            <nav className="grid gap-1">
              <Link className="rounded-md px-3 py-2 text-sm hover:bg-muted" to="/">Trang chủ</Link>
              <Link className="rounded-md px-3 py-2 text-sm hover:bg-muted" to="/products">Sản phẩm</Link>
              <Link className="rounded-md px-3 py-2 text-sm hover:bg-muted" to="/about">Giới thiệu</Link>
              <Link className="rounded-md px-3 py-2 text-sm hover:bg-muted" to="/contact">Liên hệ</Link>
              {isAuthenticated ? (
                <Link className="rounded-md px-3 py-2 text-sm hover:bg-muted" to="/profile">Tài khoản</Link>
              ) : (
                <Link className="rounded-md px-3 py-2 text-sm hover:bg-muted" to="/login">Đăng nhập / Đăng ký</Link>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
