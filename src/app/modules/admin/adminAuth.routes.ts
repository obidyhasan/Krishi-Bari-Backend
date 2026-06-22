import { Router } from "express";
import validateRequest from "../../middlewares/validateRequest";
import { AuthController } from "../auth/auth.controller";
import { AuthValidation } from "../auth/auth.validation";

const router = Router();

router.post(
  "/login",
  validateRequest(AuthValidation.login),
  AuthController.adminLogin
);
router.post(
  "/verify-2fa",
  validateRequest(AuthValidation.adminVerifyTwoFactor),
  AuthController.verifyAdminTwoFactor
);

export const AdminAuthRouter = router;
