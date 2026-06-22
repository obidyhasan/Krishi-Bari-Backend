import httpStatus from "http-status";
import { promises as fs } from "fs";
import { UserStatus } from "@prisma/client";
import ApiError from "../../errors/ApiError";
import { prisma } from "../../shared/prisma";
import { paginationHelper } from "../../helper/paginationHelper";
import { IOptions } from "../../helper/paginationHelper";
import { cloudinaryHelper } from "../../helper/cloudinaryHelper";

const getProfile = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      avatar: true,
      isEmailVerified: true,
      isPhoneVerified: true,
      createdAt: true,
    },
  });
  if (!user) throw new ApiError(httpStatus.NOT_FOUND, "User not found.");
  return user;
};

const updateProfile = async (
  userId: string,
  payload: { name?: string; phone?: string }
) => {
  const user = await prisma.user.update({
    where: { id: userId },
    data: payload,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      avatar: true,
      updatedAt: true,
    },
  });
  return user;
};

const uploadAvatar = async (userId: string, filePath: string) => {
  // Delete old avatar if exists
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user?.avatar) {
    // Extract public_id from URL if stored there, or store separately
    // For now, upload new image
  }

  try {
    const { url } = await cloudinaryHelper.uploadImage(filePath, "avatars");
    await prisma.user.update({ where: { id: userId }, data: { avatar: url } });
    return { avatar: url };
  } finally {
    try {
      await fs.unlink(filePath);
    } catch {
      // Ignore missing temp files.
    }
  }
};

const getAllUsers = async (options: IOptions, filters: Record<string, string>) => {
  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(options);
  const allowedSortFields = new Set(["createdAt", "updatedAt", "name", "email", "status"]);
  const safeSortBy = allowedSortFields.has(sortBy) ? sortBy : "createdAt";

  const where: any = {};
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { email: { contains: filters.search, mode: "insensitive" } },
    ];
  }
  if (filters.role) where.role = filters.role;
  if (filters.status) where.status = filters.status;

  const [data, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [safeSortBy]: sortOrder },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        avatar: true,
        isEmailVerified: true,
        createdAt: true,
      },
    }),
    prisma.user.count({ where }),
  ]);

  return { data, meta: { page, limit, total } };
};

const updateUserStatus = async (userId: string, status: UserStatus) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ApiError(httpStatus.NOT_FOUND, "User not found.");

  return prisma.user.update({
    where: { id: userId },
    data: { status },
    select: { id: true, email: true, status: true },
  });
};

const getSearchHistory = async (userId: string) => {
  return prisma.searchHistory.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
};

export const UserService = {
  getProfile,
  updateProfile,
  uploadAvatar,
  getAllUsers,
  updateUserStatus,
  getSearchHistory,
};
