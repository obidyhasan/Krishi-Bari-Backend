import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { AdminService } from "./admin.service";
import pick from "../../shared/pick";
import { PAGINATION_OPTIONS } from "../../constants";
import { pdfHelper } from "../../helper/pdfHelper";

const getDashboardStats = catchAsync(async (req: Request, res: Response) => {
  const from = req.query.from ? new Date(req.query.from as string) : undefined;
  const to = req.query.to ? new Date(req.query.to as string) : undefined;
  const result = await AdminService.getDashboardStats(from, to);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Dashboard stats fetched.", data: result });
});

const getSalesReport = catchAsync(async (req: Request, res: Response) => {
  const from = req.query.from ? new Date(req.query.from as string) : new Date(new Date().setDate(1));
  const to = req.query.to ? new Date(req.query.to as string) : new Date();
  const result = await AdminService.getSalesReport(from, to);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Sales report fetched.", data: result });
});

const getInventoryReport = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.getInventoryReport();
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Inventory report fetched.", data: result });
});

const exportSalesReport = catchAsync(async (req: Request, res: Response) => {
  const from = req.query.from ? new Date(req.query.from as string) : new Date(new Date().setDate(1));
  const to = req.query.to ? new Date(req.query.to as string) : new Date();
  const format = String(req.query.format || "csv").toLowerCase();
  const report = await AdminService.getSalesReport(from, to);

  if (format === "pdf") {
    const pdf = await pdfHelper.generateSalesReport(report, from, to);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=sales-report-${from.toISOString().slice(0, 10)}_to_${to.toISOString().slice(0, 10)}.pdf`);
    res.setHeader("Content-Length", pdf.length);
    return res.send(pdf);
  }

  // CSV default
  const rows = [
    ["date", "orders", "revenue"],
    ...Object.entries(report.byDate).map(([date, v]) => [
      date,
      String(v.orders),
      v.revenue.toFixed(2),
    ]),
  ];
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=sales-report.csv");
  res.send(csv);
});

const exportInventoryReport = catchAsync(async (req: Request, res: Response) => {
  const format = String(req.query.format || "csv").toLowerCase();
  const report = await AdminService.getInventoryReport();

  if (format === "pdf") {
    const pdf = await pdfHelper.generateInventoryReport(report);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=inventory-report.pdf");
    res.setHeader("Content-Length", pdf.length);
    return res.send(pdf);
  }

  const rows = [
    ["sku", "name", "category", "stock", "unit", "bucket"],
    ...report.lowStock.map((p: any) => [p.sku, p.name, p.category?.name || "", String(p.stock), p.unit, "low_stock"]),
    ...report.outOfStock.map((p: any) => [p.sku, p.name, p.category?.name || "", String(p.stock), p.unit, "out_of_stock"]),
  ];
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=inventory-report.csv");
  res.send(csv);
});

const exportDashboardReport = catchAsync(async (req: Request, res: Response) => {
  const from = req.query.from ? new Date(req.query.from as string) : undefined;
  const to = req.query.to ? new Date(req.query.to as string) : undefined;
  const stats = await AdminService.getDashboardStats(from, to);
  const pdf = await pdfHelper.generateDashboardReport(stats, from, to);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "attachment; filename=dashboard-report.pdf");
  res.setHeader("Content-Length", pdf.length);
  res.send(pdf);
});

const exportOrdersLedger = catchAsync(async (req: Request, res: Response) => {
  const csv = await AdminService.getOrdersLedgerCsv();
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=orders-ledger.csv");
  res.send(csv);
});

const exportCustomersData = catchAsync(async (req: Request, res: Response) => {
  const csv = await AdminService.getCustomersExportCsv();
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=customers-export.csv");
  res.send(csv);
});

const getAuditLogs = catchAsync(async (req: Request, res: Response) => {
  const options = pick(req.query, PAGINATION_OPTIONS);
  const result = await AdminService.getAuditLogs(options as any);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Audit logs fetched.",
    meta: result.meta,
    data: result.data,
  });
});

export const AdminController = {
  getDashboardStats,
  getSalesReport,
  getInventoryReport,
  exportSalesReport,
  exportInventoryReport,
  exportDashboardReport,
  exportOrdersLedger,
  exportCustomersData,
  getAuditLogs,
};
