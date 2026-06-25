import { Router } from "express";
import { UserRole } from "@prisma/client";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { AuthController } from "./auth.controller";
import { AuthValidation } from "./auth.validation";

const router = Router();

router.post(
  "/request-login",
  validateRequest(AuthValidation.requestLogin),
  AuthController.requestLogin
);

router.post(
  "/verify-login",
  validateRequest(AuthValidation.verifyLogin),
  AuthController.verifyLogin
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
