import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { CartService } from "./cart.service";

const getCart = catchAsync(async (req: Request, res: Response) => {
  const result = await CartService.getOrCreateCart(req.user!.userId);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Cart fetched.", data: result });
});

const addItem = catchAsync(async (req: Request, res: Response) => {
  const result = await CartService.addItem(
    req.user!.userId,
    req.body.productId,
    req.body.quantity ?? 1,
    req.body.variantId
  );
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Item added to cart.", data: result });
});

const updateItem = catchAsync(async (req: Request, res: Response) => {
  const result = await CartService.updateItem(req.user!.userId, req.params.itemId, req.body.quantity);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Cart updated.", data: result });
});

const removeItem = catchAsync(async (req: Request, res: Response) => {
  const result = await CartService.removeItem(req.user!.userId, req.params.itemId);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Item removed.", data: result });
});

const clearCart = catchAsync(async (req: Request, res: Response) => {
  const result = await CartService.clearCart(req.user!.userId);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: result.message, data: null });
});

const mergeCart = catchAsync(async (req: Request, res: Response) => {
  const result = await CartService.mergeCart(req.user!.userId, req.body.items);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Cart merged successfully.", data: result });
});

const syncCart = catchAsync(async (req: Request, res: Response) => {
  const result = await CartService.syncCart(req.user!.userId, req.body.items);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Cart synced successfully.",
    data: result,
  });
});

export const CartController = {
  getCart,
  addItem,
  updateItem,
  removeItem,
  clearCart,
  mergeCart,
  syncCart,
};
