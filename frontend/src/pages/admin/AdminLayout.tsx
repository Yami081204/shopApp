import { useState } from "react";
import { Link, useLocation, Navigate } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Users,
  LogOut,
  Menu,
  Layers,
  TicketPercent,
  ChevronRight,
  MessageSquare,
  House
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

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const location = useLocation();
  const { user, isAuthenticated, isAuthLoading, logout } = useAllContexts();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  if (isAuthLoading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Загрузка...</div>;
  }

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
      label: "Dashboard",
      href: "/admin/dashboard",
      active: isActive("/dashboard"),
    },
    {
      icon: <ShoppingBag className="h-4 w-4" />,
      label: "Orders",
      href: "/admin/orders",
      active: isActive("/orders"),
    },
    {
      icon: <Package className="h-4 w-4" />,
      label: "Products",
      href: "/admin/products",
      active: isActive("/products"),
    },
    {
      icon: <Layers className="h-4 w-4" />,
      label: "Categories",
      href: "/admin/categories",
      active: isActive("/categories"),
    },
    {
      icon: <Users className="h-4 w-4" />,
      label: "Users",
      href: "/admin/users",
      active: isActive("/users"),
    },
    {
      icon: <TicketPercent className="h-4 w-4" />,
      label: "Vouchers",
      href: "/admin/vouchers",
      active: isActive("/vouchers"),
    },
    {
      icon: <MessageSquare className="h-4 w-4" />,
      label: "Support",
      href: "/admin/support",
      active: isActive("/support"),
    }
  ];
  const currentPage = sidebarItems.find((item) => item.active)?.label || 'Admin';

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
              <Link to="/" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:bg-muted hover:text-foreground">
                <House className="h-4 w-4" />
                Về trang chủ
              </Link>
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
                <Link
                  to="/"
                  onClick={closeMobileSidebar}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
                >
                  <House className="h-4 w-4" />
                  Về trang chủ
                </Link>
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
            <Button variant="outline" size="icon" className="shrink-0" onClick={() => setMobileSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </div>
          
          <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
            <Link to="/admin/dashboard" className="hover:text-foreground">Admin</Link>
            <ChevronRight className="h-4 w-4" />
            <span className="truncate font-medium text-foreground">{currentPage}</span>
          </div>
          <div className="ml-auto flex items-center gap-4">
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
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Đăng xuất</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        
        {/* Page Content */}
        <div className="p-4 sm:p-6">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AdminLayout; 