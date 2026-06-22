import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { CouponService } from "./coupon.service";

const createCoupon = catchAsync(async (req: Request, res: Response) => {
  const result = await CouponService.createCoupon(req.body);
  sendResponse(res, { statusCode: httpStatus.CREATED, success: true, message: "Coupon created.", data: result });
});

const getAllCoupons = catchAsync(async (req: Request, res: Response) => {
  const result = await CouponService.getAllCoupons();
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Coupons fetched.", data: result });
});

const getCouponById = catchAsync(async (req: Request, res: Response) => {
  const result = await CouponService.getCouponById(req.params.id);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Coupon fetched.", data: result });
});

const updateCoupon = catchAsync(async (req: Request, res: Response) => {
  const result = await CouponService.updateCoupon(req.params.id, req.body);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Coupon updated.", data: result });
});

const deleteCoupon = catchAsync(async (req: Request, res: Response) => {
  await CouponService.deleteCoupon(req.params.id);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Coupon deleted.", data: null });
});

const validateCoupon = catchAsync(async (req: Request, res: Response) => {
  const result = await CouponService.validateCoupon(req.body.code, req.body.orderAmount, req.user!.userId);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Coupon is valid.", data: result });
});

export const CouponController = { createCoupon, getAllCoupons, getCouponById, updateCoupon, deleteCoupon, validateCoupon };
