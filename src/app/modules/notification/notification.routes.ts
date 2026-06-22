import { Router } from "express";
import { UserRole } from "@prisma/client";
import auth from "../../middlewares/auth";
import { NotificationController } from "./notification.controller";

const router = Router();
const ANY_USER = auth(UserRole.CUSTOMER, UserRole.ADMIN, UserRole.SUPER_ADMIN);

router.get("/", ANY_USER, NotificationController.getMyNotifications);
router.patch("/read-all", ANY_USER, NotificationController.markAllAsRead);
router.patch("/:id/read", ANY_USER, NotificationController.markAsRead);
router.delete("/:id", ANY_USER, NotificationController.deleteNotification);

export const NotificationRouter = router;
