import { Router } from "express";
import { UserRole } from "@prisma/client";
import auth, { optionalAuth } from "../../middlewares/auth";
import ipAllowlist from "../../middlewares/ipAllowlist";
import validateRequest from "../../middlewares/validateRequest";
import { OrderController } from "./order.controller";
import { OrderValidation } from "./order.validation";

const router = Router();
const CUSTOMER = auth(UserRole.CUSTOMER, UserRole.ADMIN, UserRole.SUPER_ADMIN);
const ADMIN = auth(UserRole.ADMIN, UserRole.SUPER_ADMIN);

router.post("/", optionalAuth, validateRequest(OrderValidation.createOrder), OrderController.createOrder);
router.get("/", CUSTOMER, OrderController.getMyOrders);
router.get("/admin", ipAllowlist, ADMIN, OrderController.getAllOrders);
router.get("/admin/:id", ipAllowlist, ADMIN, OrderController.getAdminOrderById);
router.get(
  "/admin/:id/packing-slip",
  ipAllowlist,
  ADMIN,
  OrderController.generatePackingSlip
);
router.get("/:id", CUSTOMER, OrderController.getOrderById);
router.get("/:id/invoice", CUSTOMER, OrderController.downloadInvoice);
router.patch("/:id/cancel", CUSTOMER, OrderController.cancelOrder);
router.post("/:id/reorder", CUSTOMER, OrderController.reorder);
router.patch(
  "/:id/status",
  ipAllowlist,
  ADMIN,
  validateRequest(OrderValidation.updateStatus),
  OrderController.updateOrderStatus
);

export const OrderRouter = router;
