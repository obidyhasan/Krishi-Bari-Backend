import httpStatus from "http-status";
import { OrderStatus, PaymentMethod, PaymentStatus, Prisma } from "@prisma/client";
import { prisma } from "../../shared/prisma";
import ApiError from "../../errors/ApiError";
import config from "../../config";
import { purchaseEventId } from "../tracking/hashing";
import { queuePurchaseEventByOrderId } from "../tracking/tracking.service";

// ── bKash token helper ────────────────────────────────────────────────────

let bkashToken: string | null = null;
let tokenExpiry: number = 0;

const getBkashToken = async (): Promise<string> => {
  if (bkashToken && Date.now() < tokenExpiry) return bkashToken;

  const res = await fetch(config.bkash.grant_token_url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      username: config.bkash.username,
      password: config.bkash.password,
    },
    body: JSON.stringify({
      app_key: config.bkash.app_key,
      app_secret: config.bkash.app_secret,
    }),
  });

  if (!res.ok) throw new ApiError(httpStatus.BAD_GATEWAY, "Failed to authenticate with bKash.");

  const data = (await res.json()) as any;
  bkashToken = data.id_token;
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000; // refresh 60s early
  return bkashToken as string;
};

// ── Service methods ───────────────────────────────────────────────────────

const createBkashPayment = async (orderId: string, userId: string) => {
  const order = await prisma.order.findFirst({ where: { id: orderId, userId }, include: { payment: true } });
  if (!order) throw new ApiError(httpStatus.NOT_FOUND, "Order not found.");
  if (order.paymentMethod !== PaymentMethod.BKASH) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "bKash payment is only available for BKASH payment method orders."
    );
  }
  if (order.payment?.status === PaymentStatus.COMPLETED)
    throw new ApiError(httpStatus.BAD_REQUEST, "Order is already paid.");

  const token = await getBkashToken();

  const res = await fetch(config.bkash.payment_create_url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: token, "x-app-key": config.bkash.app_key },
    body: JSON.stringify({
      mode: "0011",
      payerReference: userId,
      callbackURL: `${config.frontend_url}/payment/bkash-callback`,
      amount: order.total.toFixed(2),
      currency: "BDT",
      intent: "sale",
      merchantInvoiceNumber: order.orderNumber,
    }),
  });

  const data = (await res.json()) as any;
  if (data.statusCode !== "0000") throw new ApiError(httpStatus.BAD_GATEWAY, data.statusMessage || "bKash payment creation failed.");

  // Save bKash payment ID
  if (order.payment) {
    await prisma.payment.update({ where: { orderId }, data: { bkashPaymentId: data.paymentID } });
  }

  return { bkashURL: data.bkashURL, paymentID: data.paymentID };
};

const executeBkashPayment = async (paymentID: string, status: string) => {
  if (!paymentID) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Missing bKash paymentID.");
  }

  if (!status) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Missing bKash payment status.");
  }

  const normalizedStatus = status.toLowerCase();

  if (normalizedStatus !== "success") {
    const payment = await prisma.payment.findFirst({ where: { bkashPaymentId: paymentID } });
    if (payment) {
      await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: PaymentStatus.FAILED },
        });

        const order = await tx.order.findUnique({
          where: { id: payment.orderId },
          select: { userId: true, orderNumber: true, id: true },
        });

        if (order) {
          await tx.orderTracking.create({
            data: {
              orderId: order.id,
              status: OrderStatus.PENDING,
              message: `bKash payment ${normalizedStatus}.`,
            },
          });
          await tx.notification.create({
            data: {
              userId: order.userId,
              title: "Payment failed",
              message: `Your bKash payment for order #${order.orderNumber} was not completed (${normalizedStatus}). You can retry payment from your order details.`,
              type: "PAYMENT",
              data: { orderId: order.id, orderNumber: order.orderNumber, status: "FAILED" },
            },
          });
        }
      });
    }
    throw new ApiError(httpStatus.BAD_REQUEST, "Payment was not successful.");
  }

  const payment = await prisma.payment.findFirst({ where: { bkashPaymentId: paymentID } });
  if (!payment) throw new ApiError(httpStatus.NOT_FOUND, "Payment record not found.");

  // Idempotent handling for repeated callback hits from gateway/user refresh.
  if (payment.status === PaymentStatus.COMPLETED) {
    const existingOrder = await prisma.order.findUnique({
      where: { id: payment.orderId },
      select: { orderNumber: true },
    });
    return {
      ...payment,
      orderNumber: existingOrder?.orderNumber ?? null,
    };
  }

  const token = await getBkashToken();
  const res = await fetch(config.bkash.payment_execute_url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: token, "x-app-key": config.bkash.app_key },
    body: JSON.stringify({ paymentID }),
  });

  const data = (await res.json()) as any;
  if (data.statusCode !== "0000") {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.FAILED, gatewayResponse: data },
    });
    throw new ApiError(httpStatus.BAD_GATEWAY, data.statusMessage || "bKash payment execution failed.");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const updatedPayment = await tx.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.COMPLETED, transactionId: data.trxID, gatewayResponse: data },
    });

    const existingOrder = await tx.order.findUnique({
      where: { id: payment.orderId },
      select: { status: true, userId: true, orderNumber: true },
    });

    if (existingOrder?.status === OrderStatus.PENDING) {
      await tx.order.update({
        where: { id: payment.orderId },
        data: { status: OrderStatus.CONFIRMED },
      });
      await tx.orderTracking.create({
        data: {
          orderId: payment.orderId,
          status: OrderStatus.CONFIRMED,
          message: "Payment completed via bKash. Order confirmed.",
        },
      });

      await tx.notification.create({
        data: {
          userId: existingOrder.userId,
          title: "Payment received",
          message: `Your bKash payment was successful. Order #${existingOrder.orderNumber} is now confirmed.`,
          type: "PAYMENT",
          data: { orderId: payment.orderId, status: OrderStatus.CONFIRMED, paymentId: paymentID },
        },
      });
    }

    return updatedPayment;
  });

  const order = await prisma.order.findUnique({
    where: { id: payment.orderId },
    select: { orderNumber: true, id: true },
  });

  queuePurchaseEventByOrderId(payment.orderId).catch((error) => {
    console.error("[Tracking] Failed to queue bKash purchase event", error);
  });

  return {
    ...updated,
    orderNumber: order?.orderNumber ?? null,
    orderId: order?.id ?? payment.orderId,
    purchaseEventId: purchaseEventId(payment.orderId),
  };
};

const getPaymentByOrder = async (orderId: string, userId: string) => {
  const order = await prisma.order.findFirst({ where: { id: orderId, userId } });
  if (!order) throw new ApiError(httpStatus.NOT_FOUND, "Order not found.");
  const payment = await prisma.payment.findUnique({ where: { orderId } });
  if (!payment) throw new ApiError(httpStatus.NOT_FOUND, "Payment not found.");
  return payment;
};

const getPaymentByBkashPaymentId = async (bkashPaymentId: string) => {
  const payment = await prisma.payment.findFirst({
    where: { bkashPaymentId },
  });
  if (!payment) throw new ApiError(httpStatus.NOT_FOUND, "Payment not found.");

  const order = await prisma.order.findUnique({
    where: { id: payment.orderId },
    select: { orderNumber: true, id: true },
  });

  return {
    ...payment,
    orderNumber: order?.orderNumber ?? null,
    orderId: order?.id ?? payment.orderId,
    purchaseEventId: purchaseEventId(payment.orderId),
  };
};

const refundBkashPayment = async (orderId: string) => {
  const payment = await prisma.payment.findUnique({ where: { orderId } });
  if (!payment) throw new ApiError(httpStatus.NOT_FOUND, "Payment not found.");
  if (payment.status !== PaymentStatus.COMPLETED)
    throw new ApiError(httpStatus.BAD_REQUEST, "Only completed payments can be refunded.");
  if (!payment.transactionId)
    throw new ApiError(httpStatus.BAD_REQUEST, "No transaction ID found for this payment.");

  const token = await getBkashToken();

  const res = await fetch(`${config.bkash.payment_query_url.replace("status", "refund")}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token,
      "x-app-key": config.bkash.app_key,
    },
    body: JSON.stringify({
      paymentID: payment.bkashPaymentId,
      trxID: payment.transactionId,
      amount: payment.amount.toFixed(2),
      sku: orderId,
      reason: "Customer requested refund",
    }),
  });

  const data = (await res.json()) as { statusCode: string; statusMessage?: string; refundTrxID?: string };
  if (data.statusCode !== "0000") {
    throw new ApiError(httpStatus.BAD_GATEWAY, data.statusMessage || "bKash refund failed.");
  }

  const updated = await prisma.payment.update({
    where: { orderId },
    data: {
      status: PaymentStatus.REFUNDED,
      gatewayResponse: data as Prisma.InputJsonValue,
    },
  });

  return updated;
};

export const PaymentService = {
  createBkashPayment,
  executeBkashPayment,
  getPaymentByOrder,
  getPaymentByBkashPaymentId,
  refundBkashPayment,
};
