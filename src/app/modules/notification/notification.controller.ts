import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import pick from "../../shared/pick";
import { PAGINATION_OPTIONS } from "../../constants";
import { NotificationService } from "./notification.service";

const getMyNotifications = catchAsync(async (req: Request, res: Response) => {
  const options = pick(req.query, PAGINATION_OPTIONS);
  const result = await NotificationService.getMyNotifications(req.user!.userId, options as any);
  sendResponse(res, {
    statusCode: httpStatus.OK, success: true, message: "Notifications fetched.",
    meta: result.meta, data: { notifications: result.data, unreadCount: result.unreadCount },
  });
});

const markAsRead = catchAsync(async (req: Request, res: Response) => {
  const result = await NotificationService.markAsRead(req.params.id, req.user!.userId);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Marked as read.", data: result });
});

const markAllAsRead = catchAsync(async (req: Request, res: Response) => {
  const result = await NotificationService.markAllAsRead(req.user!.userId);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: result.message, data: null });
});

const deleteNotification = catchAsync(async (req: Request, res: Response) => {
  await NotificationService.deleteNotification(req.params.id, req.user!.userId);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Notification deleted.", data: null });
});

export const NotificationController = { getMyNotifications, markAsRead, markAllAsRead, deleteNotification };
