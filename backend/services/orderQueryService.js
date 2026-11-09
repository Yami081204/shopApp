import AppError from '../utils/AppError.js';
import { parsePositiveInteger } from '../utils/parsePositiveInteger.js';
import { normalizeOrderStatus } from './orderState.js';

const createOrderQueryService = ({
  orderQueryRepository,
  orderStatsRepository,
  now = () => new Date()
}) => {
  const findOrderForUser = async (orderId, user) => {
    const order = await orderQueryRepository.findOrder(
      parsePositiveInteger(orderId, 'id'),
      user.isAdmin ? {} : { userId: user.id }
    );
    if (!order) throw new AppError('Order not found', 404, 'NOT_FOUND');
    return order;
  };

  const listOrders = async (user, query = {}) => {
    const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 20));
    const { rows, count } = await orderQueryRepository.searchOrders({
      userId: user.isAdmin ? null : user.id,
      status: user.isAdmin && query.status && String(query.status).toUpperCase() !== 'ALL'
        ? normalizeOrderStatus(query.status)
        : null,
      search: user.isAdmin && typeof query.search === 'string' ? query.search.trim() : '',
      limit,
      offset: (page - 1) * limit
    });
    return { rows, count, page, limit };
  };

  const getStats = async () => {
    const [
      paidPayments,
      totalOrders,
      pendingOrders,
      totalCustomers,
      totalProducts,
      lowStockProducts,
      recentOrders,
      topSellingProducts
    ] = await Promise.all([
      orderStatsRepository.findPaidPayments(),
      orderStatsRepository.countOrders(),
      orderStatsRepository.countPendingOrders(),
      orderStatsRepository.countCustomers(),
      orderStatsRepository.countActiveProducts(),
      orderStatsRepository.findLowStockProducts(),
      orderStatsRepository.findRecentOrders(),
      orderStatsRepository.findTopSellingProducts()
    ]);
    const orderIds = paidPayments.map((payment) => payment.orderId);
    const monthStart = new Date(now());
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    monthStart.setMonth(monthStart.getMonth() - 5);
    const revenueByMonth = Array.from({ length: 6 }, (_, index) => {
      const month = new Date(monthStart);
      month.setMonth(monthStart.getMonth() + index);
      return {
        month: `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`,
        revenue: 0
      };
    });

    for (const payment of paidPayments) {
      if (!payment.confirmedAt) continue;
      const confirmedAt = new Date(payment.confirmedAt);
      const month = `${confirmedAt.getFullYear()}-${String(confirmedAt.getMonth() + 1).padStart(2, '0')}`;
      const bucket = revenueByMonth.find((entry) => entry.month === month);
      if (bucket) bucket.revenue += Number(payment.amount) || 0;
    }

    return {
      totalOrders,
      pendingOrders,
      totalCustomers,
      totalProducts,
      totalRevenue: paidPayments.reduce((sum, payment) => sum + Number(payment.amount), 0),
      totalProductsSold: orderIds.length
        ? Number(await orderStatsRepository.sumOrderItems(orderIds)) || 0
        : 0,
      revenueByMonth,
      lowStockProducts,
      recentOrders,
      topSellingProducts
    };
  };

  return { findOrderForUser, listOrders, getStats };
};

export { createOrderQueryService };
