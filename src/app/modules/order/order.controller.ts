import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import pick from "../../shared/pick";
import config from "../../config";
import { PAGINATION_OPTIONS } from "../../constants";
import { OrderService } from "./order.service";

const REFRESH_COOKIE_NAME = "refreshToken";
const ACCESS_COOKIE_NAME = "accessToken";

const authCookieOptions = () => ({
  httpOnly: true,
  secure: config.node_env === "production",
  sameSite: "lax" as const,
  path: "/",
});

const createOrder = catchAsync(async (req: Request, res: Response) => {
  const result = await OrderService.createOrder(req.user?.userId, req.body);
  
  if (result.auth) {
    res.cookie(ACCESS_COOKIE_NAME, result.auth.accessToken, {
      ...authCookieOptions(),
      maxAge: 15 * 60 * 1000,
    });
    res.cookie(REFRESH_COOKIE_NAME, result.auth.refreshToken, {
      ...authCookieOptions(),
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
  }

  const { auth, ...responseData } = result;

  sendResponse(res, { 
    statusCode: httpStatus.CREATED, 
    success: true, 
    message: "Order placed successfully.", 
    data: responseData 
  });
});

const getMyOrders = catchAsync(async (req: Request, res: Response) => {
  const options = pick(req.query, PAGINATION_OPTIONS);
  const result = await OrderService.getMyOrders(req.user!.userId, options as any);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Orders fetched.", meta: result.meta, data: result.data });
});

const getOrderById = catchAsync(async (req: Request, res: Response) => {
  const result = await OrderService.getOrderById(req.params.id, req.user!.userId);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Order fetched.", data: result });
});

const cancelOrder = catchAsync(async (req: Request, res: Response) => {
  const result = await OrderService.cancelOrder(req.params.id, req.user!.userId);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Order cancelled.", data: result });
});

const getAllOrders = catchAsync(async (req: Request, res: Response) => {
  const options = pick(req.query, PAGINATION_OPTIONS);
  const filters = pick(req.query, ["status", "userId"]);
  const result = await OrderService.getAllOrders(options as any, filters as any);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "All orders fetched.", meta: result.meta, data: result.data });
});

const getAdminOrderById = catchAsync(async (req: Request, res: Response) => {
  const result = await OrderService.getAdminOrderById(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Order fetched.",
    data: result,
  });
});

const updateOrderStatus = catchAsync(async (req: Request, res: Response) => {
  const io = req.app.locals.io;
  const result = await OrderService.updateOrderStatus(
    req.params.id,
    req.body.status,
    req.body.note,
    req.body.notifyCustomer,
    io,
  );
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Order status updated.", data: result });
});

const reorder = catchAsync(async (req: Request, res: Response) => {
  const result = await OrderService.reorder(req.params.id, req.user!.userId);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Items added to cart.", data: result });
});

const generatePackingSlip = catchAsync(async (req: Request, res: Response) => {
  const result = await OrderService.generatePackingSlip(req.params.id);
  res.setHeader("Content-Type", "text/html");
  res.send(result);
});

const downloadInvoice = catchAsync(async (req: Request, res: Response) => {
  const isAdmin = req.user?.role === "ADMIN" || req.user?.role === "SUPER_ADMIN";
  const pdfBuffer = await OrderService.getInvoice(
    req.params.id,
    isAdmin ? undefined : req.user!.userId
  );
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=invoice-${req.params.id}.pdf`);
  res.setHeader("Content-Length", pdfBuffer.length);
  res.send(pdfBuffer);
});

export const OrderController = {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  reorder,
  getAllOrders,
  getAdminOrderById,
  updateOrderStatus,
  generatePackingSlip,
  downloadInvoice,
};
