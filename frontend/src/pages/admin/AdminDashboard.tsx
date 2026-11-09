import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { AlertTriangle, DollarSign, Package, ShoppingBag, Users } from 'lucide-react';
import { useAllContexts } from '@/hooks/useAllContexts';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { orderService } from '@/services';
import { Order } from '@/types';

interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  totalCustomers: number;
  totalProducts: number;
  totalRevenue: number;
  revenueByMonth: Array<{ month: string; revenue: number }>;
  lowStockProducts: Array<{ id: number; name: string; countInStock: number }>;
  recentOrders: Order[];
  topSellingProducts: Array<{ productId: number; productName: string; quantitySold: number }>;
}

const currency = (value: number) => new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0
}).format(Number(value) || 0);

const AdminDashboard = () => {
  const { user, isAuthenticated, isAuthLoading } = useAllContexts();
  const { toast } = useToast();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    orderService.getOrderStats().then((data) => {
      if (active) setStats(data as DashboardStats);
    }).catch((error: unknown) => {
      if (active) toast({
        title: 'Không thể tải dashboard',
        description: (error as Error).message,
        variant: 'destructive'
      });
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [toast]);

  if (isAuthLoading) return <div className="p-6"><Skeleton className="h-40 w-full" /></div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!user?.isAdmin) return <Navigate to="/" replace />;

  const cards = [
    { title: 'Doanh thu đã thu', value: currency(stats?.totalRevenue || 0), icon: DollarSign },
    { title: 'Tổng đơn hàng', value: stats?.totalOrders ?? 0, icon: ShoppingBag },
    { title: 'Chờ xử lý', value: stats?.pendingOrders ?? 0, icon: AlertTriangle },
    { title: 'Khách hàng', value: stats?.totalCustomers ?? 0, icon: Users },
    { title: 'Sản phẩm đang bán', value: stats?.totalProducts ?? 0, icon: Package }
  ];
  const maxRevenue = Math.max(1, ...(stats?.revenueByMonth || []).map((item) => item.revenue));

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-muted-foreground">Tổng quan cửa hàng</p>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map(({ title, value, icon: Icon }) => (
          <Card key={title}>
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm text-muted-foreground">{title}</p>
                {loading ? <Skeleton className="mt-2 h-7 w-24" /> : <p className="mt-2 text-xl font-semibold">{value}</p>}
              </div>
              <Icon className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Doanh thu theo tháng</CardTitle>
            <p className="text-sm text-muted-foreground">Tính từ các khoản thanh toán đã xác nhận</p>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-48 w-full" /> : stats?.revenueByMonth?.length ? (
              <div className="grid h-48 grid-cols-6 items-end gap-3 border-b px-1">
                {stats.revenueByMonth.map((item) => (
                  <div key={item.month} className="flex h-full flex-col items-center justify-end gap-2">
                    <span className="max-w-full truncate text-center text-[10px] text-muted-foreground">{currency(item.revenue)}</span>
                    <div
                      title={`${item.month}: ${currency(item.revenue)}`}
                      className="w-full rounded-t bg-primary/80"
                      style={{ height: `${Math.max(3, (item.revenue / maxRevenue) * 65)}%` }}
                    />
                    <span className="pb-2 text-xs text-muted-foreground">{item.month.slice(5)}</span>
                  </div>
                ))}
              </div>
            ) : <p className="py-12 text-center text-sm text-muted-foreground">Chưa có dữ liệu doanh thu.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sản phẩm sắp hết hàng</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? <Skeleton className="h-40 w-full" /> : stats?.lowStockProducts?.length ? stats.lowStockProducts.map((product) => (
              <div key={product.id} className="flex items-center justify-between gap-3 border-b pb-3 last:border-0">
                <Link to="/admin/products" className="truncate text-sm font-medium hover:underline">{product.name}</Link>
                <Badge variant={product.countInStock === 0 ? 'destructive' : 'secondary'}>{product.countInStock} còn</Badge>
              </div>
            )) : <p className="py-8 text-center text-sm text-muted-foreground">Không có sản phẩm tồn kho thấp.</p>}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Đơn hàng gần đây</CardTitle>
            <Button asChild size="sm" variant="outline"><Link to="/admin/orders">Tất cả đơn hàng</Link></Button>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Mã đơn</TableHead><TableHead>Khách hàng</TableHead><TableHead>Trạng thái</TableHead><TableHead className="text-right">Tổng</TableHead></TableRow></TableHeader>
              <TableBody>
                {loading ? Array.from({ length: 3 }, (_, index) => <TableRow key={index}><TableCell colSpan={4}><Skeleton className="h-5 w-full" /></TableCell></TableRow>)
                  : stats?.recentOrders?.length ? stats.recentOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.orderNumber || `#${order.id}`}</TableCell>
                      <TableCell>{order.user?.name || '—'}</TableCell>
                      <TableCell><Badge variant="outline">{order.orderStatus || order.status}</Badge></TableCell>
                      <TableCell className="text-right">{currency(order.totalPrice)}</TableCell>
                    </TableRow>
                  )) : <TableRow><TableCell colSpan={4} className="h-20 text-center text-muted-foreground">Chưa có đơn hàng.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Sản phẩm bán chạy</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {loading ? <Skeleton className="h-40 w-full" /> : stats?.topSellingProducts?.length ? stats.topSellingProducts.map((product) => (
              <div key={`${product.productId}-${product.productName}`} className="flex items-center justify-between gap-3 border-b pb-3 last:border-0">
                <Link to="/admin/products" className="truncate text-sm font-medium hover:underline">{product.productName || `Sản phẩm #${product.productId}`}</Link>
                <span className="whitespace-nowrap text-sm text-muted-foreground">{product.quantitySold} đã bán</span>
              </div>
            )) : <p className="py-8 text-center text-sm text-muted-foreground">Chưa có dữ liệu bán hàng.</p>}
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default AdminDashboard;
