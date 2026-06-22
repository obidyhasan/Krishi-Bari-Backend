import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { WishlistService } from "./wishlist.service";
import ApiError from "../../errors/ApiError";

const getWishlist = catchAsync(async (req: Request, res: Response) => {
  const result = await WishlistService.getWishlist(req.user!.userId);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Wishlist fetched.", data: result });
});

const toggleWishlist = catchAsync(async (req: Request, res: Response) => {
  const productId = req.body.productId || req.params.productId;
  if (!productId) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Product ID is required.");
  }
  const result = await WishlistService.toggleWishlist(req.user!.userId, productId);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: result.message, data: { added: result.added } });
});

const removeFromWishlist = catchAsync(async (req: Request, res: Response) => {
  await WishlistService.removeFromWishlist(req.user!.userId, req.params.productId);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Removed from wishlist.", data: null });
});

const moveToCart = catchAsync(async (req: Request, res: Response) => {
  const result = await WishlistService.moveToCart(req.user!.userId, req.params.productId);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: result.message, data: null });
});

const toggleNotifyMe = catchAsync(async (req: Request, res: Response) => {
  const result = await WishlistService.toggleNotifyMe(req.user!.userId, req.params.productId);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Notification preference updated.", data: result });
});

export const WishlistController = { getWishlist, toggleWishlist, removeFromWishlist, moveToCart, toggleNotifyMe };
