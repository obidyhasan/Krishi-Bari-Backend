import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { GeoService } from "./geo.service";

const getDivisions = catchAsync(async (req: Request, res: Response) => {
  const result = await GeoService.getDivisions();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Divisions retrieved successfully",
    data: result,
  });
});

const getDistricts = catchAsync(async (req: Request, res: Response) => {
  const divisionId = req.query.divisionId as string | undefined;
  const result = await GeoService.getDistricts(divisionId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Districts retrieved successfully",
    data: result,
  });
});

const getUpazilas = catchAsync(async (req: Request, res: Response) => {
  const districtId = req.query.districtId as string | undefined;
  const result = await GeoService.getUpazilas(districtId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Upazilas retrieved successfully",
    data: result,
  });
});

export const GeoController = {
  getDivisions,
  getDistricts,
  getUpazilas,
};
