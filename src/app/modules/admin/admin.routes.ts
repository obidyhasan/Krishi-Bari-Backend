import { Router } from "express";
import { UserRole } from "@prisma/client";
import auth from "../../middlewares/auth";
import { AdminController } from "./admin.controller";

const router = Router();
const ADMIN = auth(UserRole.ADMIN, UserRole.SUPER_ADMIN);
const SUPER_ADMIN = auth(UserRole.SUPER_ADMIN);

router.get("/dashboard", ADMIN, AdminController.getDashboardStats);
router.get("/dashboard/export", ADMIN, AdminController.exportDashboardReport);
router.get("/reports/sales", ADMIN, AdminController.getSalesReport);
router.get("/reports/inventory", ADMIN, AdminController.getInventoryReport);
router.get("/reports/sales/export", ADMIN, AdminController.exportSalesReport);
router.get("/reports/inventory/export", ADMIN, AdminController.exportInventoryReport);
router.get("/orders/ledger", ADMIN, AdminController.exportOrdersLedger);
router.get("/customers/export", ADMIN, AdminController.exportCustomersData);
router.get("/audit-logs", SUPER_ADMIN, AdminController.getAuditLogs);

export const AdminRouter = router;
