import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { PaymentService } from "./payment.service";
import ApiError from "../../errors/ApiError";
import config from "../../config";
import crypto from "crypto";
import { redisGuards } from "../../helper/redisGuards";

const assertValidBkashCallback = (req: Request) => {
  const expectedToken = config.bkash.callback_token;
  const hmacSecret = config.bkash.callback_hmac_secret;

  // Enforce verification only when configured.
  if (!expectedToken && !hmacSecret) {
    if (config.node_env === "production") {
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        "bKash callback verification is not configured."
      );
    }
    return;
  }

  const tokenHeader = req.headers["x-bkash-token"];
  const signatureHeader = req.headers["x-bkash-signature"];
  const token = Array.isArray(tokenHeader) ? tokenHeader[0] : tokenHeader;
  const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;

  const tokenValid = expectedToken ? token === expectedToken : true;
  if (!tokenValid) {
    throw new ApiError(httpStatus.FORBIDDEN, "Invalid bKash callback token.");
  }

  // Optional cryptographic signature check (HMAC over callback params).
  // Enabled when BKASH_CALLBACK_HMAC_SECRET is configured.
  if (hmacSecret) {
    if (!signature) {
      throw new ApiError(httpStatus.FORBIDDEN, "Missing bKash callback signature.");
    }
    const paymentID = String(req.query.paymentID || req.body?.paymentID || "");
    const status = String(req.query.status || req.body?.status || "").toLowerCase();
    const expectedHmac = crypto
      .createHmac("sha256", hmacSecret)
      .update(`${paymentID}:${status}`)
      .digest("hex");
    if (signature !== expectedHmac) {
      throw new ApiError(httpStatus.FORBIDDEN, "Invalid bKash callback signature.");
    }
  }
};

const createBkashPayment = catchAsync(async (req: Request, res: Response) => {
  const orderId = req.params.orderId || req.body?.orderId;
  if (!orderId) {
    throw new ApiError(httpStatus.BAD_REQUEST, "orderId is required.");
  }
  const result = await PaymentService.createBkashPayment(orderId, req.user!.userId);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "bKash payment initiated.", data: result });
});

const executeBkashPayment = catchAsync(async (req: Request, res: Response) => {
  // Strict callback verification for webhook/callback endpoint only.
  // Browser-side execute flow (POST /payments/bkash/execute) cannot provide
  // callback headers and is authenticated by paymentID/order ownership checks.
  const isCallbackRequest =
    req.path.includes("/callback") || req.method.toUpperCase() === "GET";
  if (isCallbackRequest) {
    assertValidBkashCallback(req);
  }
  const paymentID = (req.query.paymentID || req.body?.paymentID) as string;
  const status = (req.query.status || req.body?.status || "success") as string;
  const normalizedStatus = String(status || "").toLowerCase();
  if (!["success", "failure", "cancel"].includes(normalizedStatus)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid bKash callback status.");
  }

  // Replay protection: only process a paymentID once per 15 minutes.
  const replayKey = `payments:bkash:callback:${paymentID}`;
  const firstSeen = await redisGuards.setOnce(replayKey, 15 * 60 * 1000);
  if (firstSeen === false) {
    // Already processed recently; return current known payment state without re-executing.
    const result = await PaymentService.getPaymentByBkashPaymentId(paymentID);
    sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Payment completed.", data: result });
    return;
  }

  const result = await PaymentService.executeBkashPayment(paymentID, status);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Payment completed.", data: result });
});

const getPaymentByOrder = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentService.getPaymentByOrder(req.params.orderId, req.user!.userId);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Payment fetched.", data: result });
});

const refundBkashPayment = catchAsync(async (req: Request, res: Response) => {
  const orderId = req.params.orderId || req.body?.orderId;
  if (!orderId) {
    throw new ApiError(httpStatus.BAD_REQUEST, "orderId is required.");
  }
  const result = await PaymentService.refundBkashPayment(orderId);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Refund initiated successfully.", data: result });
});

export const PaymentController = { createBkashPayment, executeBkashPayment, getPaymentByOrder, refundBkashPayment };
