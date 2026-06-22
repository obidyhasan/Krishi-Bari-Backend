import { Router } from "express";
import { UserRole } from "@prisma/client";
import auth from "../../middlewares/auth";
import { SettingController } from "./setting.controller";

const router = Router();

router.get(
  "/",
  auth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  SettingController.getAllSettings
);
router.get(
  "/:key",
  auth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  SettingController.getSetting
);
router.post("/", auth(UserRole.SUPER_ADMIN), SettingController.upsertSetting);

export const SettingRouter = router;
