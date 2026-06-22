import { z } from "zod";
import { OrderStatus } from "@prisma/client";

const createOrder = z.object({
  body: z.object({
    addressId: z.string({ required_error: "Address is required" }).uuid(),
    note: z.string().optional(),
    couponCode: z.string().optional(),
    deliverySlot: z.string().optional(),
    paymentMethod: z.enum(["BKASH", "CASH_ON_DELIVERY"]).default("CASH_ON_DELIVERY"),
  }),
});

const updateStatus = z.object({
  body: z.object({
    status: z.nativeEnum(OrderStatus),
    note: z.string().optional(),
    notifyCustomer: z.boolean().optional().default(true),
  }),
});

export const OrderValidation = { createOrder, updateStatus };
