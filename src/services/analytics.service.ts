import { prisma } from "@/lib/prisma";
import { SalesChannel, OrderStatus } from "@prisma/client";
import { subDays, startOfDay, endOfDay, startOfWeek, startOfMonth, startOfYear } from "date-fns";

// ─────────────────────────────────────────────────────────
// ANALYTICS SERVICE
// ─────────────────────────────────────────────────────────

export type DateRange = "today" | "yesterday" | "7d" | "30d" | "90d" | "year" | "all";

function getDateFilter(range: DateRange) {
  const now = new Date();
  switch (range) {
    case "today":
      return { gte: startOfDay(now), lte: endOfDay(now) };
    case "yesterday":
      return { gte: startOfDay(subDays(now, 1)), lte: endOfDay(subDays(now, 1)) };
    case "7d":
      return { gte: subDays(now, 7) };
    case "30d":
      return { gte: subDays(now, 30) };
    case "90d":
      return { gte: subDays(now, 90) };
    case "year":
      return { gte: startOfYear(now) };
    default:
      return undefined;
  }
}

export const analyticsService = {
  async getOverview(range: DateRange = "30d") {
    const dateFilter = getDateFilter(range);
    const where = dateFilter ? { createdAt: dateFilter } : {};

    const [
      totalOrders,
      revenueAgg,
      totalCustomers,
      newCustomers,
      refundAgg,
      discountAgg,
      productsSold,
      todayOrders,
      todayRevenue,
      weekRevenue,
      monthRevenue,
      yearRevenue,
      lowStock,
      outOfStock,
    ] = await Promise.all([
      prisma.order.count({ where: { ...where, status: { not: "CANCELLED" } } }),
      prisma.order.aggregate({
        where: { ...where, status: { not: "CANCELLED" } },
        _sum: { totalAmount: true },
      }),
      prisma.customer.count(),
      prisma.customer.count({ where }),
      prisma.order.aggregate({
        where: { ...where, status: "REFUNDED" },
        _sum: { totalAmount: true },
      }),
      prisma.order.aggregate({
        where: { ...where, status: { not: "CANCELLED" } },
        _sum: { discountAmount: true },
      }),
      prisma.orderItem.aggregate({
        where: { order: { ...where, status: { not: "CANCELLED" } } },
        _sum: { quantity: true },
      }),
      // Today stats (always current)
      prisma.order.count({ where: { createdAt: { gte: startOfDay(new Date()), lte: endOfDay(new Date()) }, status: { not: "CANCELLED" } } }),
      prisma.order.aggregate({
        where: { createdAt: { gte: startOfDay(new Date()), lte: endOfDay(new Date()) }, status: { not: "CANCELLED" } },
        _sum: { totalAmount: true },
      }),
      prisma.order.aggregate({
        where: { createdAt: { gte: startOfWeek(new Date()) }, status: { not: "CANCELLED" } },
        _sum: { totalAmount: true },
      }),
      prisma.order.aggregate({
        where: { createdAt: { gte: startOfMonth(new Date()) }, status: { not: "CANCELLED" } },
        _sum: { totalAmount: true },
      }),
      prisma.order.aggregate({
        where: { createdAt: { gte: startOfYear(new Date()) }, status: { not: "CANCELLED" } },
        _sum: { totalAmount: true },
      }),
      prisma.inventory.count({ where: { quantity: { lte: 5, gt: 0 } } }),
      prisma.inventory.count({ where: { quantity: 0 } }),
    ]);

    const totalRevenue = Number(revenueAgg._sum.totalAmount ?? 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return {
      totalRevenue,
      todayRevenue: Number(todayRevenue._sum.totalAmount ?? 0),
      weekRevenue: Number(weekRevenue._sum.totalAmount ?? 0),
      monthRevenue: Number(monthRevenue._sum.totalAmount ?? 0),
      yearRevenue: Number(yearRevenue._sum.totalAmount ?? 0),
      totalOrders,
      todayOrders,
      avgOrderValue,
      totalCustomers,
      newCustomers,
      productsSold: Number(productsSold._sum.quantity ?? 0),
      grossSales: totalRevenue + Number(discountAgg._sum.discountAmount ?? 0),
      discounts: Number(discountAgg._sum.discountAmount ?? 0),
      refunds: Number(refundAgg._sum.totalAmount ?? 0),
      netRevenue: totalRevenue - Number(refundAgg._sum.totalAmount ?? 0),
      lowStock,
      outOfStock,
    };
  },

  async getChannelBreakdown(range: DateRange = "30d") {
    const dateFilter = getDateFilter(range);
    const where = dateFilter ? { createdAt: dateFilter } : {};

    const channels = await prisma.order.groupBy({
      by: ["channel"],
      where: { ...where, status: { not: "CANCELLED" } },
      _sum: { totalAmount: true },
      _count: { id: true },
    });

    return channels.map((c) => ({
      channel: c.channel as SalesChannel,
      revenue: Number(c._sum.totalAmount ?? 0),
      orders: c._count.id,
    }));
  },

  async getRevenueChart(range: DateRange = "30d") {
    const dateFilter = getDateFilter(range);
    const where = dateFilter ? { createdAt: dateFilter } : {};

    const orders = await prisma.order.findMany({
      where: { ...where, status: { not: "CANCELLED" } },
      select: { createdAt: true, totalAmount: true, channel: true },
      orderBy: { createdAt: "asc" },
    });

    // Group by date
    const byDate: Record<string, { date: string; online: number; pos: number; admin: number; total: number }> = {};

    for (const order of orders) {
      const date = order.createdAt.toISOString().split("T")[0];
      if (!byDate[date]) byDate[date] = { date, online: 0, pos: 0, admin: 0, total: 0 };
      const amount = Number(order.totalAmount);
      byDate[date].total += amount;
      if (order.channel === "ONLINE") byDate[date].online += amount;
      else if (order.channel === "POS") byDate[date].pos += amount;
      else byDate[date].admin += amount;
    }

    return Object.values(byDate);
  },

  async getTopProducts(limit = 10, range: DateRange = "30d") {
    const dateFilter = getDateFilter(range);
    const where: any = dateFilter
      ? { order: { createdAt: dateFilter, status: { not: OrderStatus.CANCELLED } } }
      : { order: { status: { not: OrderStatus.CANCELLED } } };

    const items = await prisma.orderItem.groupBy({
      by: ["productId", "productName"],
      where,
      _sum: { quantity: true, totalAmount: true },
      _count: { _all: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: limit,
    });

    return items.map((i) => ({
      productId: i.productId,
      productName: i.productName,
      unitsSold: Number(i._sum?.quantity ?? 0),
      revenue: Number(i._sum?.totalAmount ?? 0),
      orders: i._count?._all ?? 0,
    }));
  },

  async getCategoryBreakdown(range: DateRange = "30d") {
    const dateFilter = getDateFilter(range);
    const where: any = dateFilter
      ? { order: { createdAt: dateFilter, status: { not: OrderStatus.CANCELLED } } }
      : { order: { status: { not: OrderStatus.CANCELLED } } };

    const items = await prisma.orderItem.findMany({
      where,
      include: { product: { include: { category: true } } },
    });

    const byCategory: Record<string, { id: string; name: string; revenue: number; units: number }> = {};
    for (const item of items) {
      const cat = item.product?.category;
      const key = cat?.id ?? "uncategorized";
      const name = cat?.name ?? "Uncategorized";
      if (!byCategory[key]) byCategory[key] = { id: key, name, revenue: 0, units: 0 };
      byCategory[key].revenue += Number(item.totalAmount ?? 0);
      byCategory[key].units += Number(item.quantity ?? 0);
    }

    const total = Object.values(byCategory).reduce((sum, c) => sum + c.revenue, 0);
    return Object.values(byCategory).map((c) => ({
      ...c,
      percentage: total > 0 ? ((c.revenue / total) * 100).toFixed(1) : "0",
    }));
  },

  async getProfitAnalytics(range: DateRange = "30d") {
    const dateFilter = getDateFilter(range);
    const where: any = dateFilter
      ? { order: { createdAt: dateFilter, status: { not: OrderStatus.CANCELLED } } }
      : { order: { status: { not: OrderStatus.CANCELLED } } };

    const items = await prisma.orderItem.findMany({
      where,
      select: { quantity: true, unitPrice: true, costPrice: true, totalAmount: true, discountAmount: true },
    });

    let grossRevenue = 0;
    let cogs = 0;
    let discounts = 0;

    for (const item of items) {
      grossRevenue += Number(item.totalAmount);
      discounts += Number(item.discountAmount);
      if (item.costPrice) cogs += Number(item.costPrice) * item.quantity;
    }

    const grossProfit = grossRevenue - cogs - discounts;
    const margin = grossRevenue > 0 ? (grossProfit / grossRevenue) * 100 : 0;

    return {
      grossRevenue,
      costOfGoodsSold: cogs,
      discounts,
      grossProfit,
      margin: margin.toFixed(2),
      isEstimated: true, // operational expenses not included
    };
  },

  async getInventoryDashboard() {
    const [inventories, products] = await Promise.all([
      prisma.inventory.findMany({ include: { product: true, variant: true } }),
      prisma.product.count({ where: { status: "ACTIVE" } }),
    ]);

    let totalQty = 0;
    let reservedQty = 0;
    let damagedQty = 0;
    let inventoryValue = 0;
    let lowStockItems: typeof inventories = [];
    let outOfStockItems: typeof inventories = [];

    for (const inv of inventories) {
      totalQty += inv.quantity;
      reservedQty += inv.reserved;
      damagedQty += inv.damaged;
      const price = Number(inv.variant?.price ?? inv.product.basePrice);
      inventoryValue += inv.quantity * price;
      if (inv.quantity === 0) outOfStockItems.push(inv);
      else if (inv.quantity <= inv.lowStockThreshold) lowStockItems.push(inv);
    }

    return {
      totalProducts: products,
      totalQuantity: totalQty,
      availableQuantity: totalQty - reservedQty,
      reservedQuantity: reservedQty,
      damagedQuantity: damagedQty,
      inventoryValue,
      lowStockCount: lowStockItems.length,
      outOfStockCount: outOfStockItems.length,
      lowStockItems: lowStockItems.slice(0, 10),
      outOfStockItems: outOfStockItems.slice(0, 10),
    };
  },
};

export default analyticsService;
