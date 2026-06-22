import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import pick from "../../shared/pick";
import { PAGINATION_OPTIONS } from "../../constants";
import { ReviewService } from "./review.service";

const createReview = catchAsync(async (req: Request, res: Response) => {
  const result = await ReviewService.createReview(req.user!.userId, req.body);
  sendResponse(res, { statusCode: httpStatus.CREATED, success: true, message: "Review submitted.", data: result });
});

const getProductReviews = catchAsync(async (req: Request, res: Response) => {
  const options = pick(req.query, PAGINATION_OPTIONS);
  const result = await ReviewService.getProductReviews(req.params.productId, options as any);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Reviews fetched.", meta: result.meta, data: result.data });
});

const updateReview = catchAsync(async (req: Request, res: Response) => {
  const result = await ReviewService.updateReview(req.params.id, req.user!.userId, req.body);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Review updated.", data: result });
});

const deleteReview = catchAsync(async (req: Request, res: Response) => {
  await ReviewService.deleteReview(req.params.id, req.user!.userId, false);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Review deleted.", data: null });
});

const adminDeleteReview = catchAsync(async (req: Request, res: Response) => {
  await ReviewService.deleteReview(req.params.id, req.user!.userId, true);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Review deleted.", data: null });
});

const approveReview = catchAsync(async (req: Request, res: Response) => {
  const result = await ReviewService.approveReview(req.params.id, req.body.isApproved);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Review status updated.", data: result });
});

export const ReviewController = { createReview, getProductReviews, updateReview, deleteReview, adminDeleteReview, approveReview };
