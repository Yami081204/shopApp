import { useState, useEffect, useCallback } from "react";
import { Navigate, Link, useNavigate, useSearchParams } from "react-router-dom";
import { 
  Users, Package, ShoppingBag, DollarSign, 
  BarChart2, PieChart, Layers, Settings, 
  Plus, Trash2, Edit, Eye, Search,
  ArrowUpRight, TrendingUp, UserPlus, X
} from "lucide-react";

import { useAllContexts } from "@/hooks/useAllContexts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { productService, userService, orderService, categoryService } from "@/services";
import { toast } from "@/hooks/use-toast";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Product, Order, Category, User } from "@/types";

// Component chính của trang Dashboard
const Dashboard = () => {
  const { user, isAuthenticated, isAuthLoading } = useAllContexts();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');
  
  const [stats, setStats] = useState({
    orders: { total: 0, growth: 0 },
    revenue: { total: 0, growth: 0 },
    products: { total: 0, growth: 0 },
    users: { total: 0, growth: 0 }
  });
  const [dashboardLoading, setDashboardLoading] = useState(true);
  
  // Handle tab change và cập nhật URL
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === 'overview') {
      setSearchParams({});
    } else {
      setSearchParams({ tab: value });
    }
  };

  // Sync tab từ URL params
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab') || 'overview';
    setActiveTab(tabFromUrl);
  }, [searchParams]);
  
  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        setDashboardLoading(true);
        // Thay thế dữ liệu mẫu bằng API calls
        const orderStatsPromise = orderService.getOrderStats();
        const productsPromise = productService.getAllProducts();
        const usersPromise = userService.getAllUsers();
        
        // Gọi API song song để tối ưu hiệu suất
        const [orderStats, products, users] = await Promise.all([
          orderStatsPromise,
          productsPromise,
          usersPromise
        ]);
        
        setStats({
          orders: { 
            total: orderStats?.totalOrders || 0, 
            growth: 12.5 
          },
          revenue: { 
            total: orderStats?.totalRevenue || 0, 
            growth: 18.2 
          },
          products: { 
            total: products.length || 0, 
            growth: 7.3 
          },
          users: { 
            total: users.length || 0, 
            growth: 22.4 
          }
        });
        setDashboardLoading(false);
      } catch (error) {
        toast({
          title: "Không thể tải dữ liệu dashboard",
          description: (error as Error).message,
          variant: "destructive",
        });
        setDashboardLoading(false);
      }
    };
    
    fetchDashboardStats();
  }, []);
  
  // Nếu đang loading auth, đợi
  if (isAuthLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-beauty-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Đang tải...</p>
        </div>
      </div>
    );
  }

  // Nếu chưa đăng nhập hoặc không phải admin, chuyển hướng về trang chủ
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  if (!user?.isAdmin) {
    return <Navigate to="/" />;
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="hidden w-64 bg-white p-4 shadow-md md:block">
        <div className="mb-6">
          <Link to="/" className="flex items-center">
            <span className="text-xl font-bold">ZaidepYamiFashion</span>
          </Link>
        </div>
        
        <nav className="space-y-1">
          <SidebarLink 
            icon={<BarChart2 size={18} />} 
            href="/dashboard" 
            active={activeTab === 'overview'}
          >
            Overview
          </SidebarLink>
          <SidebarLink 
            icon={<Package size={18} />} 
            href="/dashboard?tab=products"
            active={activeTab === 'products'}
          >
            Products
          </SidebarLink>
          <SidebarLink 
            icon={<ShoppingBag size={18} />} 
            href="/dashboard?tab=orders"
            active={activeTab === 'orders'}
          >
            Orders
          </SidebarLink>
          <SidebarLink 
            icon={<Users size={18} />} 
            href="/dashboard?tab=users"
            active={activeTab === 'users'}
          >
            Users
          </SidebarLink>
          <SidebarLink 
            icon={<Layers size={18} />} 
            href="/dashboard?tab=categories"
            active={activeTab === 'categories'}
          >
            Categories
          </SidebarLink>
          <SidebarLink 
            icon={<Settings size={18} />} 
            href="/dashboard?tab=settings"
            active={activeTab === 'settings'}
          >
            Settings
          </SidebarLink>
        </nav>
        
        <div className="mt-auto pt-8">
          <Button variant="outline" className="w-full" onClick={() => navigate('/')}>Return to store</Button>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {/* Header */}
        <header className="bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-medium">Admin</h1>
            <div className="flex items-center space-x-4">
              <div className="hidden md:block">
                <span className="text-sm font-medium">Hello, {user?.name}</span>
              </div>
            </div>
          </div>
        </header>
        
        {/* Dashboard Content */}
        <main className="p-6">
          {/* Stats */}
          <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {dashboardLoading ? (
              <>
                <Skeleton className="h-28 w-full rounded-lg" />
                <Skeleton className="h-28 w-full rounded-lg" />
                <Skeleton className="h-28 w-full rounded-lg" />
                <Skeleton className="h-28 w-full rounded-lg" />
              </>
            ) : (
              <>
                <StatsCard 
                  title="Total Orders" 
                  value={stats.orders.total.toLocaleString()} 
                  icon={<ShoppingBag className="text-indigo-600" />} 
                  trend={`+${stats.orders.growth}%`} 
                />
                <StatsCard 
                  title="Revenue" 
                  value={stats.revenue.total.toLocaleString('vi-VN')} 
                  icon={<DollarSign className="text-green-600" />} 
                  trend={`+${stats.revenue.growth}%`} 
                />
                <StatsCard 
                  title="Products" 
                  value={stats.products.total.toLocaleString()} 
                  icon={<Package className="text-amber-600" />} 
                  trend={`+${stats.products.growth}%`} 
                />
                <StatsCard 
                  title="Customers" 
                  value={stats.users.total.toLocaleString()} 
                  icon={<Users className="text-pink-600" />} 
                  trend={`+${stats.users.growth}%`} 
                />
              </>
            )}
          </div>

          {/* Thống kê nâng cao */}
          <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Orders over time</CardTitle>
                <CardDescription>Number of orders in the last 30 days</CardDescription>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="h-40 w-full bg-slate-50 flex items-center justify-center">
                  <BarChart2 className="h-10 w-10 text-slate-300" />
                  <span className="ml-2 text-slate-400">Order chart</span>
                </div>
              </CardContent>
              <CardFooter>
                <div className="flex items-center text-sm text-muted-foreground">
                  <ArrowUpRight className="mr-1 h-4 w-4 text-green-500" />
                  Up 14.2% from last month
                </div>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Revenue by category</CardTitle>
                <CardDescription>Revenue distribution by category</CardDescription>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="h-40 w-full bg-slate-50 flex items-center justify-center">
                  <PieChart className="h-10 w-10 text-slate-300" />
                  <span className="ml-2 text-slate-400">Revenue chart</span>
                </div>
              </CardContent>
              <CardFooter>
                <div className="flex items-center text-sm text-muted-foreground">
                  <TrendingUp className="mr-1 h-4 w-4 text-green-500" />
                  Fashion products account for 42% of ZaidepYamiFashion's total revenue.
                </div>
              </CardFooter>
            </Card>
          </div>
          
          {/* Conditional Content dựa trên active tab */}
          {activeTab === 'overview' ? (
            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-4">Dashboard Overview</h2>
              <p className="text-gray-600 mb-4">
                Welcome to the admin page. Select a tab from the left menu to start managing.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100" 
                     onClick={() => handleTabChange('products')}>
                  <Package className="h-8 w-8 text-blue-600 mb-2" />
                  <h3 className="font-medium">Product Management</h3>
                  <p className="text-sm text-gray-600">Add, edit, delete products</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg cursor-pointer hover:bg-green-100"
                     onClick={() => handleTabChange('orders')}>
                  <ShoppingBag className="h-8 w-8 text-green-600 mb-2" />
                  <h3 className="font-medium">Order Management</h3>
                  <p className="text-sm text-gray-600">View and update orders</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg cursor-pointer hover:bg-purple-100"
                     onClick={() => handleTabChange('users')}>
                  <Users className="h-8 w-8 text-purple-600 mb-2" />
                  <h3 className="font-medium">User Management</h3>
                  <p className="text-sm text-gray-600">View customer list</p>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg cursor-pointer hover:bg-orange-100"
                     onClick={() => handleTabChange('categories')}>
                  <Layers className="h-8 w-8 text-orange-600 mb-2" />
                  <h3 className="font-medium">Category Management</h3>
                  <p className="text-sm text-gray-600">Create and edit categories</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <Tabs value={activeTab} onValueChange={handleTabChange}>
                <TabsList className="mb-4 grid w-full grid-cols-5">
                  <TabsTrigger value="products">Products</TabsTrigger>
                  <TabsTrigger value="orders">Orders</TabsTrigger>
                  <TabsTrigger value="users">Users</TabsTrigger>
                  <TabsTrigger value="categories">Categories</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>
                
                <TabsContent value="products">
                  <ProductsTab />
                </TabsContent>
                
                <TabsContent value="orders">
                  <OrdersTab />
                </TabsContent>
                
                <TabsContent value="users">
                  <UsersTab />
                </TabsContent>
                
                <TabsContent value="categories">
                  <CategoriesTab />
                </TabsContent>
                
                <TabsContent value="settings">
                  <SettingsTab />
                </TabsContent>
              </Tabs>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

// Components con phụ trợ
const SidebarLink = ({ 
  children, 
  icon, 
  href, 
  active = false 
}: { 
  children: React.ReactNode; 
  icon: React.ReactNode; 
  href: string; 
  active?: boolean; 
}) => {
  return (
    <Link
      to={href}
      className={`flex items-center rounded-md px-3 py-2 text-sm ${
        active 
          ? "bg-beauty-50 text-beauty-600" 
          : "text-gray-700 hover:bg-gray-100 hover:text-beauty-600"
      }`}
    >
      <span className="mr-2">{icon}</span>
      {children}
    </Link>
  );
};

const StatsCard = ({ 
  title, 
  value, 
  icon, 
  trend 
}: { 
  title: string; 
  value: string; 
  icon: React.ReactNode; 
  trend: string; 
}) => {
  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        <div className="rounded-full bg-gray-100 p-2">{icon}</div>
      </div>
      <div className="mt-2 flex items-baseline space-x-2">
        <span className="text-2xl font-semibold">{value}</span>
        <span className="text-xs font-medium text-green-600">{trend}</span>
      </div>
    </div>
  );
};

// Tab sản phẩm
const ProductsTab = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteProductId, setDeleteProductId] = useState<number | null>(null);
  const { toast } = useToast();
  
  const [formData, setFormData] = useState<Product>({
    id: 0,
    name: '',
    description: '',
    price: 0,
    countInStock: 0,
    categoryId: undefined,
    rating: 0,
    numReviews: 0,
    image: '',
    category: undefined
  });
  
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const productsData = await productService.getAllProducts();
        setProducts(productsData);
      } catch (error) {
        console.error("Lỗi khi tải sản phẩm:", error);
        toast({
          title: "Lỗi",
          description: "Không thể tải danh sách sản phẩm",
          variant: "destructive"
        });
        // Sử dụng dữ liệu mẫu khi có lỗi
        setProducts([
          {
            id: 1,
            name: "Son môi đỏ Ruby",
            description: "Son màu đỏ ruby sang trọng, lâu trôi",
            price: 250000,
            countInStock: 50,
            image: "https://placehold.co/400x400?text=Son+Ruby",
            categoryId: 1,
            rating: 4.5,
            numReviews: 12,
            category: { id: 1, name: "Son môi" }
          },
          {
            id: 2,
            name: "Son kem lì Blooming",
            description: "Son kem lì, không khô môi",
            price: 320000,
            countInStock: 30,
            image: "https://placehold.co/400x400?text=Son+Kem",
            categoryId: 2,
            rating: 4.8,
            numReviews: 20,
            category: { id: 2, name: "Son kem" }
          },
          {
            id: 3,
            name: "Son bóng Sheer Gloss",
            description: "Son bóng trong suốt, tạo hiệu ứng căng mọng",
            price: 180000,
            countInStock: 45,
            image: "https://placehold.co/400x400?text=Son+Bong",
            categoryId: 3,
            rating: 4.2,
            numReviews: 8,
            category: { id: 3, name: "Son bóng" }
          },
          {
            id: 4,
            name: "Son dưỡng Honey",
            description: "Son dưỡng chiết xuất mật ong, dưỡng ẩm 24h",
            price: 150000,
            countInStock: 60,
            image: "https://placehold.co/400x400?text=Son+Duong",
            categoryId: 4,
            rating: 4.7,
            numReviews: 35,
            category: { id: 4, name: "Son dưỡng" }
          }
        ]);
      } finally {
        setLoading(false);
      }
    };
    
    const fetchCategories = async () => {
      try {
        const categoriesData = await categoryService.getAllCategories();
        setCategories(categoriesData);
      } catch (error) {
        console.error("Lỗi khi tải danh mục:", error);
        // Sử dụng dữ liệu mẫu khi có lỗi
        setCategories([
          { id: 1, name: "Son môi" },
          { id: 2, name: "Son kem" },
          { id: 3, name: "Son bóng" },
          { id: 4, name: "Son dưỡng" }
        ]);
      }
    };
    
    // Gọi cả 2 API song song
    Promise.all([fetchProducts(), fetchCategories()]);
  }, [toast]);
  
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };
  
  const filteredProducts = products.filter((product) => 
    product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.id?.toString().includes(searchTerm)
  );
  
  const handleOpenDialog = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        id: product.id || 0,
        name: product.name || '',
        description: product.description || '',
        price: product.price || 0,
        countInStock: product.countInStock || 0,
        categoryId: product.categoryId || undefined,
        rating: product.rating || 0,
        numReviews: product.numReviews || 0,
        image: product.image || '',
        category: product.category || undefined
      });
    } else {
      setEditingProduct(null);
      setFormData({
        id: 0,
        name: '',
        description: '',
        price: 0,
        countInStock: 0,
        categoryId: undefined,
        rating: 0,
        numReviews: 0,
        image: '',
        category: undefined
      });
    }
    setIsDialogOpen(true);
  };
  
  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingProduct(null);
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsFormSubmitting(true);
      
      const productData = {
        ...formData,
        price: parseFloat(formData.price.toString()),
        countInStock: parseInt(formData.countInStock.toString()),
        categoryId: formData.categoryId ? parseInt(formData.categoryId.toString()) : undefined,
        rating: formData.rating,
        numReviews: formData.numReviews
      };
      
      if (editingProduct) {
        // Cập nhật sản phẩm thông qua API
        const updatedProduct = await productService.updateProduct(editingProduct.id, productData);
        if (updatedProduct) {
          setProducts(prevProducts => 
            prevProducts.map(p => p.id === editingProduct.id ? updatedProduct : p)
          );
          toast({
            title: "Thành công",
            description: "Sản phẩm đã được cập nhật",
          });
        }
      } else {
        // Tạo sản phẩm mới thông qua API
        const newProduct = await productService.createProduct(productData);
        if (newProduct) {
          setProducts(prev => [...prev, newProduct]);
          toast({
            title: "Thành công",
            description: "Sản phẩm đã được tạo",
          });
        }
      }
      
      // Đóng dialog
      handleCloseDialog();
    } catch (error) {
      console.error("Lỗi khi lưu sản phẩm:", error);
      toast({
        title: "Lỗi",
        description: "Không thể lưu sản phẩm",
        variant: "destructive"
      });
    } finally {
      setIsFormSubmitting(false);
    }
  };
  
  const handleDeleteClick = (productId) => {
    setDeleteProductId(productId);
    setIsDeleteDialogOpen(true);
  };
  
  const handleDeleteProduct = async () => {
    if (!deleteProductId) return;
    
    try {
      setIsFormSubmitting(true);
      
      // Xóa sản phẩm thông qua API
      const success = await productService.deleteProduct(deleteProductId);
      
      if (success) {
        setProducts(prevProducts => prevProducts.filter(p => p.id !== deleteProductId));
        toast({
          title: "Thành công",
          description: "Sản phẩm đã được xóa",
        });
      } else {
        throw new Error("Không thể xóa sản phẩm");
      }
    } catch (error) {
      console.error("Lỗi khi xóa sản phẩm:", error);
      toast({
        title: "Lỗi",
        description: "Không thể xóa sản phẩm",
        variant: "destructive"
      });
    } finally {
      setIsFormSubmitting(false);
      setIsDeleteDialogOpen(false);
      setDeleteProductId(null);
    }
  };
  
  return (
    <div>
      <div className="mb-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <h2 className="text-lg font-medium">Quản lý sản phẩm</h2>
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Tìm sản phẩm..." 
              className="pl-8" 
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>
          <Button size="sm" onClick={() => handleOpenDialog()}>
            <Plus size={16} className="mr-2" /> Thêm mới
          </Button>
        </div>
      </div>
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Sản phẩm</TableHead>
              <TableHead>Giá</TableHead>
              <TableHead>Tồn kho</TableHead>
              <TableHead>Danh mục</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  Đang tải sản phẩm...
                </TableCell>
              </TableRow>
            ) : filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  {searchTerm ? "Không tìm thấy sản phẩm phù hợp" : "Không có sản phẩm nào"}
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.id}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-md bg-gray-100 overflow-hidden">
                        {product.image && (
                          <img 
                            src={product.image} 
                            alt={product.name} 
                            className="h-full w-full object-cover"
                          />
                        )}
                      </div>
                      <span>{product.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{product.price?.toLocaleString('vi-VN')} VND</TableCell>
                  <TableCell>{product.countInStock}</TableCell>
                  <TableCell>{product.category?.name || '-'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        title="Xem chi tiết"
                      >
                        <Eye size={16} />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        title="Chỉnh sửa"
                        onClick={() => handleOpenDialog(product)}
                      >
                        <Edit size={16} />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        title="Xóa"
                        onClick={() => handleDeleteClick(product.id)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Dialog thêm/sửa sản phẩm */}
      {isDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-medium">
                {editingProduct ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm mới"}
              </h3>
              <Button 
                size="icon" 
                variant="ghost" 
                onClick={handleCloseDialog}
                disabled={isFormSubmitting}
              >
                <X size={18} />
              </Button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium">
                    Tên sản phẩm <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="description" className="block text-sm font-medium">
                    Mô tả
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows={3}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={formData.description}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="price" className="block text-sm font-medium">
                      Giá <span className="text-red-500">*</span>
                    </label>
                    <Input
                      id="price"
                      name="price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.price}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="countInStock" className="block text-sm font-medium">
                      Số lượng <span className="text-red-500">*</span>
                    </label>
                    <Input
                      id="countInStock"
                      name="countInStock"
                      type="number"
                      min="0"
                      value={formData.countInStock}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="categoryId" className="block text-sm font-medium">
                    Danh mục
                  </label>
                  <select
                    id="categoryId"
                    name="categoryId"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={formData.categoryId || ''}
                    onChange={handleInputChange}
                  >
                    <option value="">-- Chọn danh mục --</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label htmlFor="image" className="block text-sm font-medium">
                    URL hình ảnh
                  </label>
                  <Input
                    id="image"
                    name="image"
                    type="url"
                    value={formData.image}
                    onChange={handleInputChange}
                    placeholder="https://"
                  />
                </div>
              </div>
              
              <div className="mt-6 flex justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleCloseDialog} 
                  disabled={isFormSubmitting}
                >
                  Hủy
                </Button>
                <Button 
                  type="submit" 
                  disabled={isFormSubmitting}
                >
                  {isFormSubmitting ? 
                    "Đang lưu..." : 
                    editingProduct ? "Cập nhật" : "Tạo sản phẩm"
                  }
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Dialog xác nhận xóa */}
      {isDeleteDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg">
            <h3 className="mb-4 text-lg font-medium">Xác nhận xóa</h3>
            <p className="mb-6 text-muted-foreground">
              Bạn có chắc chắn muốn xóa sản phẩm này? Hành động này không thể hoàn tác.
            </p>
            
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsDeleteDialogOpen(false)}
                disabled={isFormSubmitting}
              >
                Hủy
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDeleteProduct}
                disabled={isFormSubmitting}
              >
                {isFormSubmitting ? "Đang xóa..." : "Xóa sản phẩm"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Tab đơn hàng
const OrdersTab = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditStatusDialogOpen, setIsEditStatusDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const [editStatusValue, setEditStatusValue] = useState<string>("");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");

  // Fetch orders from API
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const response = await orderService.getAllOrders();
      setOrders(response);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách đơn hàng",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleConfirmPayment = async () => {
    if (!selectedOrder || !paymentReference.trim() || !paymentAmount.trim()) {
      toast({
        title: "Thiếu thông tin đối soát",
        description: "Nhập mã giao dịch và số tiền thực tế đã đối soát.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const updatedOrder = await orderService.confirmPayment(
        selectedOrder.id,
        paymentReference.trim(),
        Number(paymentAmount)
      );
      setOrders(prevOrders => prevOrders.map(order =>
        order.id === updatedOrder.id ? { ...order, isPaid: true, paidAt: updatedOrder.paidAt } : order
      ));
      setSelectedOrder({ ...selectedOrder, isPaid: true, paidAt: updatedOrder.paidAt });
      setPaymentReference("");
      setPaymentAmount("");
      toast({ title: "Đã xác nhận thanh toán", description: "Mã giao dịch đã được lưu cho đơn hàng." });
    } catch (error) {
      toast({
        title: "Không thể xác nhận thanh toán",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (orderId: number, newStatus: string) => {
    try {
      setIsSubmitting(true);
      
      const updatedOrder = await orderService.updateOrderStatus(orderId.toString(), newStatus);
      
      if (updatedOrder) {
        // Update local state
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order.id === orderId ? { ...order, status: updatedOrder.status } : order
          )
        );
        
        toast({
          title: "Thành công",
          description: "Cập nhật trạng thái đơn hàng thành công",
        });
        setIsEditStatusDialogOpen(false);
        setSelectedOrder(null);
      } else {
        throw new Error("Không thể cập nhật trạng thái");
      }
    } catch (error) {
      console.error("Error updating order status:", error);
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật trạng thái đơn hàng",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setPaymentReference("");
    setPaymentAmount("");
    setIsViewDialogOpen(true);
  };

  const handleEditStatus = (order: Order) => {
    setSelectedOrder(order);
    setEditStatusValue(order.status);
    setIsEditStatusDialogOpen(true);
  };

  const handleCloseDialogs = () => {
    setIsViewDialogOpen(false);
    setIsEditStatusDialogOpen(false);
    setSelectedOrder(null);
  };

  const filteredOrders = orders.filter(order => 
    order.id.toString().includes(searchTerm) ||
    (order.userId?.toString().includes(searchTerm)) ||
    order.status?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <Badge variant="default">Hoàn thành</Badge>;
      case 'pending':
        return <Badge variant="secondary">Chờ xử lý</Badge>;
      case 'confirmed':
        return <Badge variant="default">Đã xác nhận</Badge>;
      case 'processing':
        return <Badge variant="secondary">Đang xử lý</Badge>;
      case 'paid':
        return <Badge variant="default" className="bg-green-100 text-green-800">Đã thanh toán</Badge>;
      case 'shipped':
        return <Badge variant="secondary">Đã giao hàng</Badge>;
      case 'delivered':
        return <Badge variant="default">Đã nhận hàng</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Đã hủy</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const statusOptions = [
    { value: "pending", label: "Chờ xử lý" },
    { value: "confirmed", label: "Đã xác nhận" },
    { value: "processing", label: "Đang xử lý" },
    { value: "shipped", label: "Đã giao hàng" },
    { value: "delivered", label: "Đã nhận hàng" },
    { value: "cancelled", label: "Đã hủy" }
  ];

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Skeleton className="h-10 w-[200px]" />
          </div>
          <Skeleton className="h-10 w-[200px]" />
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Khách hàng</TableHead>
                <TableHead>Ngày đặt</TableHead>
                <TableHead>Tổng tiền</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1, 2, 3, 4, 5].map((i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-[50px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-[100px]" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Input
            placeholder="Tìm kiếm đơn hàng..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-[300px]"
          />
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            onClick={fetchOrders}
            disabled={loading}
          >
            {loading ? "Đang tải..." : "Làm mới"}
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Khách hàng</TableHead>
              <TableHead>Ngày đặt</TableHead>
              <TableHead>Tổng tiền</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  {searchTerm ? "Không tìm thấy đơn hàng phù hợp" : "Chưa có đơn hàng nào"}
                </TableCell>
              </TableRow>
            ) : (
              filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>#{order.id}</TableCell>
                  <TableCell>
                    {order.user?.name
                      ? order.user.name
                      : order.userId
                        ? `User #${order.userId}`
                        : "Unknown"}
                  </TableCell>
                  <TableCell>{formatDate(order.createdAt)}</TableCell>
                  <TableCell>{formatPrice(order.totalPrice)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(order.status)}
                      {order.isPaid && (
                        <Badge variant="outline" className="text-green-600">
                          Đã thanh toán
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleViewDetails(order)}
                        title="Xem chi tiết"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleEditStatus(order)}
                        title="Cập nhật trạng thái"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Chi tiết đơn hàng */}
      {isViewDialogOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-medium">Chi tiết đơn hàng #{selectedOrder.id}</h3>
              <Button 
                size="icon" 
                variant="ghost" 
                onClick={handleCloseDialogs}
              >
                <X size={18} />
              </Button>
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Thông tin khách hàng</h4>
                  <p>Tên: {selectedOrder.user?.name || 'Không có thông tin'}</p>
                  <p>Email: {selectedOrder.user?.email || 'Không có thông tin'}</p>
                  <p>ID: {selectedOrder.userId}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Thông tin đơn hàng</h4>
                  <p>Ngày đặt: {formatDate(selectedOrder.createdAt)}</p>
                  <p>Trạng thái: {getStatusBadge(selectedOrder.status)}</p>
                  <p>Phương thức thanh toán: {selectedOrder.paymentMethod}</p>
                  {selectedOrder.payment?.paymentReference && (
                    <p>Mã tham chiếu thanh toán: {selectedOrder.payment.paymentReference}</p>
                  )}
                  {selectedOrder.paymentTransactions?.map((paymentTransaction) => (
                    <p key={paymentTransaction.id}>
                      Giao dịch khách báo: {paymentTransaction.transactionReference}
                      {' '}({paymentTransaction.status}, {formatPrice(paymentTransaction.amount)})
                    </p>
                  ))}
                  <p>Tình trạng thanh toán: {selectedOrder.isPaid ? (
                    <span className="text-green-600 font-medium">
                      Đã thanh toán {selectedOrder.paidAt && `(${formatDate(selectedOrder.paidAt)})`}
                    </span>
                  ) : (
                    <span className="text-red-600 font-medium">Chưa thanh toán</span>
                  )}</p>
                  <p>Tổng tiền: {formatPrice(selectedOrder.totalPrice)}</p>
                  {!selectedOrder.isPaid && selectedOrder.status !== 'cancelled' && (
                    <div className="mt-3 space-y-2">
                      <label htmlFor="paymentReference" className="block text-sm font-medium">
                        Mã giao dịch ngân hàng / biên nhận COD đã đối soát
                      </label>
                      {selectedOrder.paymentMethod === 'VIETQR' && (
                        <p className="text-xs text-muted-foreground">
                          Chỉ xác nhận sau khi đối chiếu sao kê ngân hàng, mã tham chiếu thanh toán và đúng số tiền.
                        </p>
                      )}
                      <Input
                        id="paymentReference"
                        value={paymentReference}
                        onChange={(event) => setPaymentReference(event.target.value)}
                        maxLength={191}
                        placeholder="Nhập mã giao dịch duy nhất"
                        disabled={isSubmitting}
                      />
                      <label htmlFor="paymentAmount" className="block text-sm font-medium">
                        Số tiền thực tế đã đối soát (VND)
                      </label>
                      <Input
                        id="paymentAmount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={paymentAmount}
                        onChange={(event) => setPaymentAmount(event.target.value)}
                        disabled={isSubmitting}
                      />
                      <Button
                        onClick={handleConfirmPayment}
                        disabled={isSubmitting || !paymentReference.trim() || !paymentAmount.trim()}
                      >
                        {isSubmitting ? "Đang xác nhận..." : "Xác nhận đã nhận tiền"}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <h4 className="mb-2 text-sm font-medium text-muted-foreground">Sản phẩm</h4>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sản phẩm</TableHead>
                        <TableHead>Số lượng</TableHead>
                        <TableHead>Đơn giá</TableHead>
                        <TableHead>Thành tiền</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedOrder.orderItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {(item.productImage || item.product.image) && (
                                <div className="h-8 w-8 rounded-md bg-gray-100 overflow-hidden">
                                  <img 
                                    src={item.productImage || item.product.image} 
                                    alt={item.productName || item.product.name} 
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                              )}
                              <span>{item.productName || item.product.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>{formatPrice(item.price)}</TableCell>
                          <TableCell>{formatPrice(item.price * item.quantity)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
              
              <div>
                <h4 className="mb-2 text-sm font-medium text-muted-foreground">Địa chỉ giao hàng</h4>
                <p>{typeof selectedOrder.shippingAddress === 'string'
                  ? selectedOrder.shippingAddress
                  : [
                    selectedOrder.shippingAddress.address,
                    selectedOrder.shippingAddress.city,
                    selectedOrder.shippingAddress.postalCode,
                    selectedOrder.shippingAddress.country
                  ].filter(Boolean).join(', ')}</p>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <Button onClick={handleCloseDialogs}>Đóng</Button>
            </div>
          </div>
        </div>
      )}

      {/* Cập nhật trạng thái */}
      {isEditStatusDialogOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-medium">Cập nhật trạng thái đơn hàng #{selectedOrder.id}</h3>
              <Button 
                size="icon" 
                variant="ghost" 
                onClick={handleCloseDialogs}
                disabled={isSubmitting}
              >
                <X size={18} />
              </Button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium">Trạng thái hiện tại</label>
                <div className="mt-1">{getStatusBadge(selectedOrder.status)}</div>
              </div>
              <div>
                <label htmlFor="newStatus" className="block text-sm font-medium">
                  Trạng thái mới
                </label>
                <select
                  id="newStatus"
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={editStatusValue}
                  onChange={e => setEditStatusValue(e.target.value)}
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={handleCloseDialogs} 
                disabled={isSubmitting}
              >
                Hủy
              </Button>
              <Button 
                onClick={() => handleUpdateStatus(selectedOrder.id, editStatusValue)}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Đang cập nhật..." : "Cập nhật"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Tab người dùng
const UsersTab = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const { toast } = useToast();
  
  const [formData, setFormData] = useState<Partial<User>>({
    name: '',
    email: '',
    isAdmin: false,
    status: 'active'
  });
  
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const usersData = await userService.getAllUsers();
        setUsers(usersData.map(user => ({
          id: user.id.toString(),
          name: user.name,
          email: user.email,
          isAdmin: user.isAdmin,
          status: user.status || 'active'
        })));
      } catch (error) {
        console.error("Lỗi khi tải danh sách người dùng:", error);
        toast({
          title: "Lỗi",
          description: "Không thể tải danh sách người dùng",
          variant: "destructive"
        });
        // Sử dụng dữ liệu mẫu khi có lỗi
        setUsers([
          { id: "1", name: "Nguyễn Văn A", email: "nguyenvana@example.com", isAdmin: true, status: "active" },
          { id: "2", name: "Trần Thị B", email: "tranthib@example.com", isAdmin: false, status: "active" },
          { id: "3", name: "Lê Văn C", email: "levanc@example.com", isAdmin: false, status: "inactive" },
          { id: "4", name: "Phạm Thị D", email: "phamthid@example.com", isAdmin: false, status: "active" },
          { id: "5", name: "Hoàng Văn E", email: "hoangvane@example.com", isAdmin: false, status: "active" }
        ]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUsers();
  }, [toast]);
  
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };
  
  const filteredUsers = users.filter((user) => 
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const handleOpenUserDialog = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
        status: user.status || 'active'
      });
    } else {
      setEditingUser(null);
      setFormData({
        name: '',
        email: '',
        isAdmin: false,
        status: 'active'
      });
    }
    setIsUserDialogOpen(true);
  };
  
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };
  
  const handleDeleteClick = (userId) => {
    setDeleteUserId(userId);
    setIsDeleteDialogOpen(true);
  };
  
  const handleSubmitUser = async (e) => {
    e.preventDefault();
    
    try {
      setIsSubmitting(true);
      
      if (editingUser) {
        // Cập nhật người dùng thông qua API
        const updatedUserData = await userService.updateUser(
          parseInt(editingUser.id), 
          { 
            name: formData.name,
            email: formData.email,
            isAdmin: formData.isAdmin,
            status: formData.status
          }
        );
        
        if (updatedUserData) {
          const updatedUser = {
            id: updatedUserData.id.toString(),
            name: updatedUserData.name,
            email: updatedUserData.email,
            isAdmin: updatedUserData.isAdmin,
            status: updatedUserData.status || 'active'
          };
          
          setUsers(users.map(u => u.id === editingUser.id ? updatedUser : u));
          toast({
            title: "Thành công",
            description: "Thông tin người dùng đã được cập nhật",
          });
        }
      } else {
        // Tạo người dùng mới thông qua API
        const newUserData = await userService.createUser({
          name: formData.name || '',
          email: formData.email || '',
          isAdmin: formData.isAdmin || false,
          status: formData.status || 'active',
          password: 'password123' // Mật khẩu mặc định, nên thay đổi trong ứng dụng thực tế
        });
        
        if (newUserData) {
          const newUser = {
            id: newUserData.id.toString(),
            name: newUserData.name,
            email: newUserData.email,
            isAdmin: newUserData.isAdmin,
            status: newUserData.status || 'active'
          };
          
          setUsers([...users, newUser]);
          toast({
            title: "Thành công", 
            description: "Người dùng mới đã được tạo",
          });
        }
      }
      
      setIsUserDialogOpen(false);
      setEditingUser(null);
    } catch (error) {
      console.error("Lỗi khi lưu người dùng:", error);
      toast({
        title: "Lỗi",
        description: "Không thể lưu thông tin người dùng",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDeleteUser = async () => {
    if (!deleteUserId) return;
    
    try {
      setIsSubmitting(true);
      
      // Xóa người dùng thông qua API
      const success = await userService.deleteUser(parseInt(deleteUserId));
      
      if (success) {
        setUsers(users.filter(user => user.id !== deleteUserId));
        toast({
          title: "Thành công",
          description: "Người dùng đã được xóa",
        });
      } else {
        throw new Error("Không thể xóa người dùng");
      }
    } catch (error) {
      console.error("Lỗi khi xóa người dùng:", error);
      toast({
        title: "Lỗi",
        description: "Không thể xóa người dùng",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
      setIsDeleteDialogOpen(false);
      setDeleteUserId(null);
    }
  };
  
  return (
    <div>
      <div className="mb-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <h2 className="text-lg font-medium">Quản lý người dùng</h2>
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Tìm theo tên, email..." 
              className="pl-8" 
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>
          <Button size="sm" onClick={() => handleOpenUserDialog()}>
            <UserPlus size={16} className="mr-2" /> Thêm người dùng
          </Button>
        </div>
      </div>
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Người dùng</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Vai trò</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Skeleton className="h-8 w-8 rounded-md" />
                      <Skeleton className="h-8 w-8 rounded-md" />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  {searchTerm ? 'Không tìm thấy người dùng phù hợp' : 'Không có người dùng nào'}
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.id}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`} />
                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span>{user.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={user.isAdmin ? "default" : "outline"}>
                      {user.isAdmin ? 'Admin' : 'Người dùng'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={user.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}>
                      {user.status === 'active' ? 'Hoạt động' : 'Bị khóa'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        size="icon" 
                        variant="ghost"
                        onClick={() => handleOpenUserDialog(user)}
                      >
                        <Edit size={16} />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost"
                        onClick={() => handleDeleteClick(user.id)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Dialog thêm/sửa người dùng */}
      {isUserDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-medium">
                {editingUser ? "Chỉnh sửa người dùng" : "Thêm người dùng mới"}
              </h3>
              <Button 
                size="icon" 
                variant="ghost" 
                onClick={() => setIsUserDialogOpen(false)}
                disabled={isSubmitting}
              >
                <X size={18} />
              </Button>
            </div>
            
            <form onSubmit={handleSubmitUser}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium">
                    Họ tên <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="flex items-center">
                  <Checkbox
                    id="isAdmin"
                    name="isAdmin"
                    checked={formData.isAdmin}
                    onCheckedChange={(checked) => 
                      setFormData({ ...formData, isAdmin: Boolean(checked) })
                    }
                  />
                  <label htmlFor="isAdmin" className="ml-2 text-sm font-medium">
                    Cấp quyền quản trị viên
                  </label>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsUserDialogOpen(false)} 
                  disabled={isSubmitting}
                >
                  Hủy
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 
                    "Đang lưu..." : 
                    editingUser ? "Cập nhật" : "Tạo người dùng"
                  }
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Dialog xác nhận xóa */}
      {isDeleteDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg">
            <h3 className="mb-4 text-lg font-medium">Xác nhận xóa</h3>
            <p className="mb-6 text-muted-foreground">
              Bạn có chắc chắn muốn xóa người dùng này? Hành động này không thể hoàn tác.
            </p>
            
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsDeleteDialogOpen(false)}
                disabled={isSubmitting}
              >
                Hủy
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDeleteUser}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Đang xóa..." : "Xóa người dùng"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Tab danh mục
const CategoriesTab = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteCategoryId, setDeleteCategoryId] = useState<number | null>(null);

  const [formData, setFormData] = useState<Partial<Category>>({
    name: "",
    description: "",
    image: ""
  });

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        const categoriesData = await categoryService.getAllCategories();
        
        // Lấy số lượng sản phẩm cho mỗi danh mục
        const productsData = await productService.getAllProducts();
        
        const categoriesWithCount = categoriesData.map(category => {
          const productsInCategory = productsData.filter(
            product => product.categoryId === category.id
          );
          return {
            ...category,
            count: productsInCategory.length
          };
        });
        
        setCategories(categoriesWithCount);
      } catch (error) {
        console.error("Lỗi khi tải danh mục:", error);
        toast({
          title: "Lỗi",
          description: "Không thể tải danh sách danh mục",
          variant: "destructive"
        });
        // Sử dụng dữ liệu mẫu khi có lỗi
        setCategories([
          {
            id: 1,
            name: "Son môi",
            description: "Các loại son lên màu rõ nét, lâu trôi",
            image: "https://placehold.co/200x200?text=Son+Moi",
            count: 45
          },
          {
            id: 2,
            name: "Son kem",
            description: "Son kem lì mịn môi, không gây khô môi",
            image: "https://placehold.co/200x200?text=Son+Kem",
            count: 32
          },
          {
            id: 3,
            name: "Son bóng",
            description: "Son bóng tạo hiệu ứng căng mọng cho đôi môi",
            image: "https://placehold.co/200x200?text=Son+Bong",
            count: 18
          },
          {
            id: 4,
            name: "Son dưỡng",
            description: "Son dưỡng môi, chống khô và nứt nẻ",
            image: "https://placehold.co/200x200?text=Son+Duong",
            count: 27
          }
        ]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCategories();
  }, [toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      
      if (!formData.name) {
        toast({
          title: "Lỗi",
          description: "Tên danh mục không được để trống",
          variant: "destructive",
        });
        return;
      }
      
      if (editingCategory) {
        // Cập nhật danh mục thông qua API
        const updatedCategory = await categoryService.updateCategory(
          editingCategory.id, 
          {
            name: formData.name,
            description: formData.description,
            image: formData.image
          }
        );
        
        if (updatedCategory) {
          // Giữ lại count từ danh mục cũ
          const categoryWithCount = {
            ...updatedCategory,
            count: editingCategory.count || 0
          };
          
          setCategories(prevCategories => 
            prevCategories.map(c => c.id === editingCategory.id ? categoryWithCount : c)
          );
          
          toast({
            title: "Thành công",
            description: "Cập nhật danh mục thành công",
          });
        }
      } else {
        // Tạo danh mục mới thông qua API
        const newCategory = await categoryService.createCategory({
          name: formData.name || "",
          description: formData.description || "",
          image: formData.image || ""
        });
        
        if (newCategory) {
          // Thêm trường count với giá trị mặc định là 0
          const categoryWithCount = {
            ...newCategory,
            count: 0
          };
          
          setCategories([...categories, categoryWithCount]);
          
          toast({
            title: "Thành công",
            description: "Tạo danh mục mới thành công",
          });
        }
      }
      setIsDialogOpen(false);
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể lưu danh mục",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deleteCategoryId) return;
    
    try {
      setIsSubmitting(true);
      
      // Xóa danh mục thông qua API
      const success = await categoryService.deleteCategory(deleteCategoryId);
      
      if (success) {
        setCategories(prevCategories => prevCategories.filter(c => c.id !== deleteCategoryId));
        toast({
          title: "Thành công",
          description: "Xóa danh mục thành công",
        });
      } else {
        throw new Error("Không thể xóa danh mục");
      }
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể xóa danh mục",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      setIsDeleteDialogOpen(false);
      setDeleteCategoryId(null);
    }
  };

  const handleOpenDialog = (category: Category | null = null) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        description: category.description || "",
        image: category.image || ""
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name: "",
        description: "",
        image: ""
      });
    }
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (categoryId: number) => {
    setDeleteCategoryId(categoryId);
    setIsDeleteDialogOpen(true);
  };

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Skeleton className="h-10 w-[200px]" />
          </div>
          <Skeleton className="h-10 w-[200px]" />
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Tên danh mục</TableHead>
                <TableHead>Mô tả</TableHead>
                <TableHead>Số sản phẩm</TableHead>
                <TableHead>Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1, 2, 3, 4, 5].map((i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-[50px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[50px]" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-[100px]" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Input
            placeholder="Tìm kiếm danh mục..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-[300px]"
          />
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Thêm danh mục
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Tên danh mục</TableHead>
              <TableHead>Mô tả</TableHead>
              <TableHead>Số sản phẩm</TableHead>
              <TableHead>Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCategories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  {searchTerm ? "Không tìm thấy danh mục phù hợp" : "Chưa có danh mục nào"}
                </TableCell>
              </TableRow>
            ) : (
              filteredCategories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell>#{category.id}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {category.image && (
                        <img
                          src={category.image}
                          alt={category.name}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      )}
                      <span>{category.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{category.description || "-"}</TableCell>
                  <TableCell>{category.count || 0}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(category)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(category.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog thêm/sửa danh mục */}
      {isDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-medium">
                {editingCategory ? "Chỉnh sửa danh mục" : "Thêm danh mục mới"}
              </h3>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setIsDialogOpen(false)}
                disabled={isSubmitting}
              >
                <X size={18} />
              </Button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium">
                    Tên danh mục <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium">
                    Mô tả
                  </label>
                  <textarea
                    id="description"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>

                <div>
                  <label htmlFor="image" className="block text-sm font-medium">
                    URL hình ảnh
                  </label>
                  <Input
                    id="image"
                    type="url"
                    value={formData.image}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    placeholder="https://"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={isSubmitting}
                >
                  Hủy
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting
                    ? "Đang lưu..."
                    : editingCategory
                    ? "Cập nhật"
                    : "Tạo danh mục"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dialog xác nhận xóa */}
      {isDeleteDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg">
            <h3 className="mb-4 text-lg font-medium">Xác nhận xóa</h3>
            <p className="mb-6 text-muted-foreground">
              Bạn có chắc chắn muốn xóa danh mục này? Hành động này không thể hoàn tác.
            </p>
            
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsDeleteDialogOpen(false)}
                disabled={isSubmitting}
              >
                Hủy
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDeleteCategory}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Đang xóa..." : "Xóa danh mục"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Tab cài đặt
const SettingsTab = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [settings, setSettings] = useState({
    siteName: 'ZaidepYamiFashion',
    siteDescription: 'Cửa hàng thời trang và mỹ phẩm cao cấp',
    currency: 'VND',
    taxRate: 10,
    shippingFee: 30000,
    freeShippingThreshold: 500000,
    enableNotifications: true,
    enablePaymentQR: true
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setSettings(prev => ({
        ...prev,
        [name]: checked
      }));
    } else if (type === 'number') {
      setSettings(prev => ({
        ...prev,
        [name]: parseFloat(value) || 0
      }));
    } else {
      setSettings(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Giả lập API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Thành công",
        description: "Cài đặt đã được lưu thành công",
      });
    } catch (error) {
      toast({
        title: "Lỗi", 
        description: "Không thể lưu cài đặt",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Cài đặt hệ thống</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Thông tin chung */}
        <Card>
          <CardHeader>
            <CardTitle>Thông tin chung</CardTitle>
            <CardDescription>Cài đặt thông tin cơ bản của website</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="siteName" className="block text-sm font-medium mb-1">
                  Tên website
                </label>
                <Input
                  id="siteName"
                  name="siteName"
                  type="text"
                  value={settings.siteName}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <label htmlFor="currency" className="block text-sm font-medium mb-1">
                  Đơn vị tiền tệ
                </label>
                <select
                  id="currency"
                  name="currency"
                  value={settings.currency}
                  onChange={handleInputChange}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="VND">VND (Vietnam Dong)</option>
                  <option value="USD">USD (US Dollar)</option>
                </select>
              </div>
            </div>
            
            <div>
              <label htmlFor="siteDescription" className="block text-sm font-medium mb-1">
                Mô tả website
              </label>
              <textarea
                id="siteDescription"
                name="siteDescription"
                rows={3}
                value={settings.siteDescription}
                onChange={handleInputChange}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </CardContent>
        </Card>

        {/* Cài đặt thanh toán và vận chuyển */}
        <Card>
          <CardHeader>
            <CardTitle>Thanh toán & Vận chuyển</CardTitle>
            <CardDescription>Cài đặt thuế, phí vận chuyển và thanh toán</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="taxRate" className="block text-sm font-medium mb-1">
                  Thuế VAT (%)
                </label>
                <Input
                  id="taxRate"
                  name="taxRate"
                  type="number"
                  min="0"
                  max="100"
                  value={settings.taxRate}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <label htmlFor="shippingFee" className="block text-sm font-medium mb-1">
                  Phí vận chuyển (VND)
                </label>
                <Input
                  id="shippingFee"
                  name="shippingFee"
                  type="number"
                  min="0"
                  value={settings.shippingFee}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <label htmlFor="freeShippingThreshold" className="block text-sm font-medium mb-1">
                  Miễn phí ship từ (VND)
                </label>
                <Input
                  id="freeShippingThreshold"
                  name="freeShippingThreshold"
                  type="number"
                  min="0"
                  value={settings.freeShippingThreshold}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tính năng */}
        <Card>
          <CardHeader>
            <CardTitle>Tính năng</CardTitle>
            <CardDescription>Bật/tắt các tính năng của hệ thống</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label htmlFor="enableNotifications" className="font-medium">
                  Thông báo real-time
                </label>
                <p className="text-sm text-gray-600">Hiển thị thông báo khi có đơn hàng mới</p>
              </div>
              <input
                id="enableNotifications"
                name="enableNotifications"
                type="checkbox"
                checked={settings.enableNotifications}
                onChange={handleInputChange}
                className="h-4 w-4"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <label htmlFor="enablePaymentQR" className="font-medium">
                  Thanh toán QR Code
                </label>
                <p className="text-sm text-gray-600">Cho phép thanh toán qua mã QR VietQR</p>
              </div>
              <input
                id="enablePaymentQR"
                name="enablePaymentQR"
                type="checkbox"
                checked={settings.enablePaymentQR}
                onChange={handleInputChange}
                className="h-4 w-4"
              />
            </div>
            
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Đang lưu..." : "Lưu cài đặt"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default Dashboard; 
