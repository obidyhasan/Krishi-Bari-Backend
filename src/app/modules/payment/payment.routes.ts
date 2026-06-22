import { Router } from "express";
import { UserRole } from "@prisma/client";
import auth from "../../middlewares/auth";
import { PaymentController } from "./payment.controller";

const router = Router();
const CUSTOMER = auth(UserRole.CUSTOMER, UserRole.ADMIN, UserRole.SUPER_ADMIN);

router.post("/bkash/:orderId/create", CUSTOMER, PaymentController.createBkashPayment);
router.post("/bkash/create", CUSTOMER, PaymentController.createBkashPayment);
router.post("/bkash/execute", PaymentController.executeBkashPayment);
router.get("/bkash/callback", PaymentController.executeBkashPayment);
router.post("/bkash/callback", PaymentController.executeBkashPayment);
router.get("/order/:orderId", CUSTOMER, PaymentController.getPaymentByOrder);
router.post("/admin/:orderId/refund", auth(UserRole.ADMIN, UserRole.SUPER_ADMIN), PaymentController.refundBkashPayment);
router.post(
  "/admin/payments/refund",
  auth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  PaymentController.refundBkashPayment
);

export const PaymentRouter = router;
