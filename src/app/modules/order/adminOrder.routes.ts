import { Router } from "express";
import { UserRole } from "@prisma/client";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { OrderController } from "./order.controller";
import { OrderValidation } from "./order.validation";

const router = Router();
const ADMIN = auth(UserRole.ADMIN, UserRole.SUPER_ADMIN);

router.get("/", ADMIN, OrderController.getAllOrders);
router.get("/:id", ADMIN, OrderController.getAdminOrderById);
router.get("/:id/invoice", ADMIN, OrderController.downloadInvoice);
router.get("/:id/packing-slip", ADMIN, OrderController.generatePackingSlip);
router.patch(
  "/:id/status",
  ADMIN,
  validateRequest(OrderValidation.updateStatus),
  OrderController.updateOrderStatus
);

export const AdminOrderRouter = router;
