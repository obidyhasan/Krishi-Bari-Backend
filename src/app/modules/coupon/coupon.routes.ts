import { Router } from "express";
import { UserRole } from "@prisma/client";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { CouponController } from "./coupon.controller";
import { CouponValidation } from "./coupon.validation";

const router = Router();
const CUSTOMER = auth(UserRole.CUSTOMER, UserRole.ADMIN, UserRole.SUPER_ADMIN);
const ADMIN = auth(UserRole.ADMIN, UserRole.SUPER_ADMIN);

router.post("/validate", CUSTOMER, validateRequest(CouponValidation.validateCoupon), CouponController.validateCoupon);
router.get("/", ADMIN, CouponController.getAllCoupons);
router.get("/:id", ADMIN, CouponController.getCouponById);
router.post("/", ADMIN, validateRequest(CouponValidation.createCoupon), CouponController.createCoupon);
router.patch("/:id", ADMIN, validateRequest(CouponValidation.updateCoupon), CouponController.updateCoupon);
router.delete("/:id", ADMIN, CouponController.deleteCoupon);

export const CouponRouter = router;
