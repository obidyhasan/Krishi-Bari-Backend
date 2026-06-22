import { NotificationType } from "@prisma/client";
import { prisma } from "../../shared/prisma";
import ApiError from "../../errors/ApiError";
import httpStatus from "http-status";
import { paginationHelper, IOptions } from "../../helper/paginationHelper";

const createNotification = async (payload: {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
  data?: object;
}) => {
  return prisma.notification.create({ data: payload });
};

const getMyNotifications = async (userId: string, options: IOptions) => {
  const { page, limit, skip } = paginationHelper.calculatePagination(options);
  const [data, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.notification.count({ where: { userId } }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ]);
  return { data, meta: { page, limit, total }, unreadCount };
};

const markAsRead = async (notificationId: string, userId: string) => {
  const notification = await prisma.notification.findFirst({ where: { id: notificationId, userId } });
  if (!notification) throw new ApiError(httpStatus.NOT_FOUND, "Notification not found.");
  return prisma.notification.update({ where: { id: notificationId }, data: { isRead: true } });
};

const markAllAsRead = async (userId: string) => {
  await prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
  return { message: "All notifications marked as read." };
};

const deleteNotification = async (notificationId: string, userId: string) => {
  const notification = await prisma.notification.findFirst({ where: { id: notificationId, userId } });
  if (!notification) throw new ApiError(httpStatus.NOT_FOUND, "Notification not found.");
  return prisma.notification.delete({ where: { id: notificationId } });
};

export const NotificationService = {
  createNotification,
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};
