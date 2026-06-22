import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import pick from "../../shared/pick";
import { PAGINATION_OPTIONS } from "../../constants";
import { UserService } from "./user.service";

const getProfile = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.getProfile(req.user!.userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Profile fetched successfully.",
    data: result,
  });
});

const updateProfile = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.updateProfile(req.user!.userId, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Profile updated successfully.",
    data: result,
  });
});

const uploadAvatar = catchAsync(async (req: Request, res: Response) => {
  const file = req.file;
  if (!file) throw new Error("No file uploaded.");
  const result = await UserService.uploadAvatar(req.user!.userId, file.path);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Avatar uploaded successfully.",
    data: result,
  });
});

const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  const options = pick(req.query, PAGINATION_OPTIONS);
  const filters = pick(req.query, ["search", "role", "status"]);
  const result = await UserService.getAllUsers(options as any, filters as any);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Users fetched successfully.",
    meta: result.meta,
    data: result.data,
  });
});

const updateUserStatus = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.updateUserStatus(
    req.params.userId,
    req.body.status
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User status updated.",
    data: result,
  });
});

const getSearchHistory = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.getSearchHistory(req.user!.userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Search history fetched.",
    data: result,
  });
});

export const UserController = {
  getProfile,
  updateProfile,
  uploadAvatar,
  getAllUsers,
  updateUserStatus,
  getSearchHistory,
};
