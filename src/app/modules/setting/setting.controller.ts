import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { SettingService } from "./setting.service";

const getAllSettings = catchAsync(async (req: Request, res: Response) => {
  const result = await SettingService.getAllSettings();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Settings fetched successfully.",
    data: result,
  });
});

const getSetting = catchAsync(async (req: Request, res: Response) => {
  const result = await SettingService.getSetting(req.params.key);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Setting fetched successfully.",
    data: result,
  });
});

const upsertSetting = catchAsync(async (req: Request, res: Response) => {
  const result = await SettingService.upsertSetting(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Setting updated successfully.",
    data: result,
  });
});

export const SettingController = {
  getAllSettings,
  getSetting,
  upsertSetting,
};
