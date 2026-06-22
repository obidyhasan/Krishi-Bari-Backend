import { Router } from "express";
import { UserRole } from "@prisma/client";
import auth from "../../middlewares/auth";
import { imageUpload } from "../../middlewares/upload";
import validateRequest from "../../middlewares/validateRequest";
import { UserController } from "./user.controller";
import { UserValidation } from "./user.validation";

const router = Router();

router.get("/me", auth(UserRole.CUSTOMER, UserRole.ADMIN, UserRole.SUPER_ADMIN), UserController.getProfile);
router.patch(
  "/me",
  auth(UserRole.CUSTOMER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validateRequest(UserValidation.updateProfile),
  UserController.updateProfile
);
router.post(
  "/me/avatar",
  auth(UserRole.CUSTOMER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  imageUpload.single("avatar"),
  UserController.uploadAvatar
);
router.get(
  "/me/search-history",
  auth(UserRole.CUSTOMER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  UserController.getSearchHistory
);
router.get("/", auth(UserRole.ADMIN, UserRole.SUPER_ADMIN), UserController.getAllUsers);
router.patch(
  "/:userId/status",
  auth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validateRequest(UserValidation.updateUserStatus),
  UserController.updateUserStatus
);

export const UserRouter = router;
