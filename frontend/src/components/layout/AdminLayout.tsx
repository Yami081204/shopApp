import { useState } from "react";
import { Link, Outlet, useLocation, Navigate } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Users,
  Settings,
  CreditCard,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Layers,
  Bell
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAllContexts } from "@/hooks/useAllContexts";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { getAssetUrl } from "@/lib/config";

const SidebarItem = ({ icon, label, href, active }: { 
  icon: React.ReactNode; 
  label: string; 
  href: string; 
  active: boolean 
}) => {
  return (
    <Link to={href}>
      <div
        className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${
          active 
            ? "bg-primary text-primary-foreground" 
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
      >
        {icon}
        {label}
      </div>
    </Link>
  );
};

const AdminLayout = () => {
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAllContexts();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  if (!user?.isAdmin) {
    return <Navigate to="/" />;
  }

  const isActive = (path: string) => {
    return location.pathname === `/admin${path}` || 
      (path !== "" && location.pathname.startsWith(`/admin${path}`));
  };

  const sidebarItems = [
    {
      icon: <LayoutDashboard className="h-4 w-4" />,
      label: "Bảng điều khiển",
      href: "/admin/dashboard",
      active: isActive("/dashboard"),
    },
    {
      icon: <ShoppingBag className="h-4 w-4" />,
      label: "Đơn hàng",
      href: "/admin/orders",
      active: isActive("/orders"),
    },
    {
      icon: <Package className="h-4 w-4" />,
      label: "Sản phẩm",
      href: "/admin/products",
      active: isActive("/products"),
    },
    {
      icon: <Layers className="h-4 w-4" />,
      label: "Danh mục",
      href: "/admin/categories",
      active: isActive("/categories"),
    },
    {
      icon: <Users className="h-4 w-4" />,
      label: "Khách hàng",
      href: "/admin/customers",
      active: isActive("/customers"),
    },
    {
      icon: <Settings className="h-4 w-4" />,
      label: "Cài đặt",
      href: "/admin/settings",
      active: isActive("/settings"),
    },
  ];

  const closeMobileSidebar = () => {
    setMobileSidebarOpen(false);
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar cho màn hình lớn */}
      <aside className="hidden w-64 border-r bg-card lg:block">
        <div className="flex h-full flex-col">
          <div className="border-b p-4">
            <Link to="/admin/dashboard" className="flex items-center gap-2 font-semibold">
              <div className="rounded-md bg-primary p-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5 text-primary-foreground"
                >
                  <path d="m8 3 4 8 5-5 5 15H2L8 3z" />
                </svg>
              </div>
              <span>LipstickAdmin</span>
            </Link>
          </div>
          <div className="flex-1 overflow-auto py-4">
            <nav className="grid gap-1 px-2">
              {sidebarItems.map((item, index) => (
                <SidebarItem
                  key={index}
                  icon={item.icon}
                  label={item.label}
                  href={item.href}
                  active={item.active}
                />
              ))}
            </nav>
          </div>
          <div className="border-t p-4">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={getAssetUrl(user?.avatarUrl)} />
                <AvatarFallback>{user?.name?.charAt(0) || 'A'}</AvatarFallback>
              </Avatar>
              <div className="flex-1 overflow-hidden">
                <div className="font-medium leading-none">{user?.name}</div>
                <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
              </div>
              <Button variant="ghost" size="icon" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Sidebar cho màn hình nhỏ */}
      <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <div className="flex h-full flex-col">
            <div className="border-b p-4">
              <Link 
                to="/admin/dashboard" 
                className="flex items-center gap-2 font-semibold"
                onClick={closeMobileSidebar}
              >
                <div className="rounded-md bg-primary p-1">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5 text-primary-foreground"
                  >
                    <path d="m8 3 4 8 5-5 5 15H2L8 3z" />
                  </svg>
                </div>
                <span>LipstickAdmin</span>
              </Link>
            </div>
            <div className="flex-1 overflow-auto py-4">
              <nav className="grid gap-1 px-2">
                {sidebarItems.map((item, index) => (
                  <Link 
                    key={index} 
                    to={item.href}
                    onClick={closeMobileSidebar}
                  >
                    <div
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${
                        item.active 
                          ? "bg-primary text-primary-foreground" 
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      {item.icon}
                      {item.label}
                    </div>
                  </Link>
                ))}
              </nav>
            </div>
            <div className="border-t p-4">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={getAssetUrl(user?.avatarUrl)} />
                  <AvatarFallback>{user?.name?.charAt(0) || 'A'}</AvatarFallback>
                </Avatar>
                <div className="flex-1 overflow-hidden">
                  <div className="font-medium leading-none">{user?.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
                </div>
                <Button variant="ghost" size="icon" onClick={handleLogout}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <main className="flex-1">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 sm:px-6">
          <div className="lg:hidden">
            <SheetTrigger asChild onClick={() => setMobileSidebarOpen(true)}>
              <Button variant="outline" size="icon" className="shrink-0">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
          </div>
          
          <div className="ml-auto flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                    3
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Thông báo</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {Array.from({ length: 3 }).map((_, i) => (
                  <DropdownMenuItem key={i} className="flex flex-col items-start p-4">
                    <div className="flex w-full justify-between">
                      <div className="font-medium">
                        {i === 0 ? "Đơn hàng mới" : i === 1 ? "Sản phẩm sắp hết hàng" : "Khách hàng mới"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {i === 0 ? "5 phút trước" : i === 1 ? "1 giờ trước" : "1 ngày trước"}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {i === 0 
                        ? "Có đơn hàng mới cần được xử lý" 
                        : i === 1 
                        ? "Một số sản phẩm sắp hết hàng trong kho" 
                        : "Có khách hàng mới đăng ký tài khoản"}
                    </div>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem className="justify-center">
                  Xem tất cả thông báo
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* User dropdown on mobile */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={getAssetUrl(user?.avatarUrl)} />
                    <AvatarFallback>{user?.name?.charAt(0) || 'A'}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span>{user?.name}</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {user?.email}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Link to="/admin/settings" className="flex w-full">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Cài đặt</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Đăng xuất</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        
        {/* Page content */}
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout; 