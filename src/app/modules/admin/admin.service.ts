import { ProductStatus } from "@prisma/client";
import { prisma } from "../../shared/prisma";
import { paginationHelper, IOptions } from "../../helper/paginationHelper";

const getDashboardStats = async (from?: Date, to?: Date) => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Build date filter for period-scoped queries
  const periodFilter = from && to ? { gte: from, lte: to } : undefined;

  const [
    totalOrders,
    ordersToday,
    pendingOrders,
    totalRevenue,
    revenueThisMonth,
    totalCustomers,
    newCustomersToday,
    totalProducts,
    lowStockProducts,
    recentOrders,
    topProducts,
  ] = await Promise.all([
    prisma.order.count({ where: periodFilter ? { createdAt: periodFilter } : undefined }),
    prisma.order.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.order.count({ where: { status: "PENDING", ...(periodFilter ? { createdAt: periodFilter } : {}) } }),
    prisma.order.aggregate({
      _sum: { total: true },
      where: { status: { notIn: ["CANCELLED", "RETURNED"] }, ...(periodFilter ? { createdAt: periodFilter } : {}) },
    }),
    prisma.order.aggregate({
      _sum: { total: true },
      where: { createdAt: { gte: monthStart }, status: { notIn: ["CANCELLED", "RETURNED"] } },
    }),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.user.count({ where: { role: "CUSTOMER", createdAt: { gte: todayStart } } }),
    prisma.product.count({ where: { status: ProductStatus.ACTIVE } }),
    prisma.product.findMany({
      where: { stock: { lte: 10 }, status: ProductStatus.ACTIVE },
      select: { id: true, name: true, stock: true, sku: true },
      take: 10,
    }),
    prisma.order.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      where: periodFilter ? { createdAt: periodFilter } : undefined,
      include: { user: { select: { id: true, name: true, email: true } }, payment: true },
    }),
    prisma.orderItem.groupBy({
      by: ["productId"],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 10,
      where: periodFilter
        ? { order: { createdAt: periodFilter, status: { notIn: ["CANCELLED", "RETURNED"] } } }
        : { order: { status: { notIn: ["CANCELLED", "RETURNED"] } } },
    }),
  ]);

  const topProductIds = topProducts.map((p) => p.productId);
  const topProductDetails = await prisma.product.findMany({
    where: { id: { in: topProductIds } },
    select: { id: true, name: true, price: true, images: { where: { isPrimary: true }, take: 1 } },
  });

  const topProductsEnriched = topProducts.map((tp) => ({
    ...tp,
    product: topProductDetails.find((p) => p.id === tp.productId),
  }));

  return {
    orders: {
      total: totalOrders,
      today: ordersToday,
      pending: pendingOrders,
    },
    revenue: {
      total: totalRevenue._sum.total ?? 0,
      thisMonth: revenueThisMonth._sum.total ?? 0,
    },
    customers: {
      total: totalCustomers,
      newToday: newCustomersToday,
    },
    products: {
      total: totalProducts,
      lowStock: lowStockProducts,
    },
    recentOrders,
    topProducts: topProductsEnriched,
  };
};

const getSalesReport = async (from: Date, to: Date) => {
  const orders = await prisma.order.findMany({
    where: { createdAt: { gte: from, lte: to }, status: { notIn: ["CANCELLED", "RETURNED"] } },
    include: { items: true },
    orderBy: { createdAt: "asc" },
  });

  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
  const totalOrders = orders.length;
  const totalItems = orders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0), 0);

  const byDate: Record<string, { revenue: number; orders: number }> = {};
  for (const order of orders) {
    const date = order.createdAt.toISOString().split("T")[0];
    if (!byDate[date]) byDate[date] = { revenue: 0, orders: 0 };
    byDate[date].revenue += order.total;
    byDate[date].orders += 1;
  }

  return { totalRevenue, totalOrders, totalItems, byDate };
};

const getInventoryReport = async () => {
  const [lowStock, outOfStock, totalProducts] = await Promise.all([
    prisma.product.findMany({
      where: { stock: { gt: 0, lte: 10 }, status: ProductStatus.ACTIVE },
      select: { id: true, name: true, sku: true, stock: true, unit: true, category: { select: { name: true } } },
      orderBy: { stock: "asc" },
    }),
    prisma.product.findMany({
      where: { stock: 0, status: ProductStatus.ACTIVE },
      select: { id: true, name: true, sku: true, stock: true, unit: true, category: { select: { name: true } } },
    }),
    prisma.product.count({ where: { status: ProductStatus.ACTIVE } }),
  ]);

  return { totalProducts, lowStock, outOfStock, lowStockCount: lowStock.length, outOfStockCount: outOfStock.length };
};

const getAuditLogs = async (options: IOptions) => {
  const { page, limit, skip } = paginationHelper.calculatePagination(options);
  const [data, total] = await Promise.all([
    prisma.auditLog.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        actor: { select: { id: true, name: true, email: true, role: true } },
      },
    }),
    prisma.auditLog.count(),
  ]);
  return { data, meta: { page, limit, total } };
};

const getOrdersLedgerCsv = async (): Promise<string> => {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, email: true } },
      items: { select: { name: true, quantity: true, price: true } },
    },
  });

  const csvEscape = (v: string) => `"${String(v).replace(/"/g, '""')}"`;

  const headers = [
    "Order Number",
    "Customer Name",
    "Customer Email",
    "Date",
    "Payment Method",
    "Status",
    "Items Count",
    "Subtotal (Tk.)",
    "Delivery Fee (Tk.)",
    "Discount (Tk.)",
    "Total (Tk.)",
  ];

  const rows = orders.map((o) => [
    csvEscape(o.orderNumber),
    csvEscape(o.user?.name ?? ""),
    csvEscape(o.user?.email ?? ""),
    csvEscape(new Date(o.createdAt).toISOString().split("T")[0]),
    csvEscape(o.paymentMethod),
    csvEscape(o.status),
    csvEscape(String(o.items.length)),
    csvEscape(o.subtotal.toFixed(2)),
    csvEscape(o.deliveryFee.toFixed(2)),
    csvEscape(o.discount.toFixed(2)),
    csvEscape(o.total.toFixed(2)),
  ]);

  return [headers.map(csvEscape).join(","), ...rows.map((r) => r.join(","))].join("\n");
};

const getCustomersExportCsv = async (): Promise<string> => {
  const customers = await prisma.user.findMany({
    where: { role: "CUSTOMER" },
    orderBy: { createdAt: "desc" },
    select: {
      name: true,
      email: true,
      phone: true,
      status: true,
      isEmailVerified: true,
      createdAt: true,
      _count: { select: { orders: true } },
    },
  });

  const csvEscape = (v: string) => `"${String(v).replace(/"/g, '""')}"`;

  const headers = [
    "Name",
    "Email",
    "Phone",
    "Status",
    "Email Verified",
    "Total Orders",
    "Registered On",
  ];

  const rows = customers.map((c) => [
    csvEscape(c.name),
    csvEscape(c.email),
    csvEscape(c.phone ?? ""),
    csvEscape(c.status),
    csvEscape(c.isEmailVerified ? "Yes" : "No"),
    csvEscape(String(c._count.orders)),
    csvEscape(new Date(c.createdAt).toISOString().split("T")[0]),
  ]);

  return [headers.map(csvEscape).join(","), ...rows.map((r) => r.join(","))].join("\n");
};

export const AdminService = {
  getDashboardStats,
  getSalesReport,
  getInventoryReport,
  getAuditLogs,
  getOrdersLedgerCsv,
  getCustomersExportCsv,
};
