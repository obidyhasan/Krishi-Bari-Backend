import { Router } from "express";
import { UserRole } from "@prisma/client";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { AuthController } from "./auth.controller";
import { AuthValidation } from "./auth.validation";

const router = Router();

router.post(
  "/register",
  validateRequest(AuthValidation.register),
  AuthController.register
);
router.post(
  "/send-otp",
  validateRequest(AuthValidation.sendOtp),
  AuthController.sendOtp
);
router.post(
  "/verify-otp",
  validateRequest(AuthValidation.verifyOtp),
  AuthController.verifyOtp
);
router.post(
  "/verify-email",
  validateRequest(AuthValidation.verifyEmail),
  AuthController.verifyEmail
);
router.post(
  "/login",
  validateRequest(AuthValidation.login),
  AuthController.login
);
router.post(
  "/refresh-token",
  validateRequest(AuthValidation.refreshToken),
  AuthController.refreshToken
);
router.post(
  "/refresh",
  validateRequest(AuthValidation.refreshToken),
  AuthController.refreshToken
);
router.post(
  "/forgot-password",
  validateRequest(AuthValidation.forgotPassword),
  AuthController.forgotPassword
);
router.post(
  "/reset-password",
  validateRequest(AuthValidation.resetPassword),
  AuthController.resetPassword
);
router.post(
  "/change-password",
  auth(UserRole.CUSTOMER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validateRequest(AuthValidation.changePassword),
  AuthController.changePassword
);
router.post(
  "/logout",
  auth(UserRole.CUSTOMER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  AuthController.logout
);
router.get(
  "/me",
  auth(UserRole.CUSTOMER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  AuthController.getMe
);

router.get(
  "/socket-token",
  auth(UserRole.CUSTOMER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  AuthController.getSocketToken
);

export const AuthRouter = router;
