import { z } from "zod";
import { OrderStatus } from "@prisma/client";

const createOrder = z.object({
  body: z.object({
    addressId: z.string().uuid().optional(),
    guest: z.object({
      name: z.string({ required_error: "Name is required for guest checkout" }),
      phone: z.string({ required_error: "Phone is required for guest checkout" }),
      email: z.string({ required_error: "Email is required for guest checkout" }).email(),
      address: z.string({ required_error: "Address is required for guest checkout" })
    }).optional(),
    cartItems: z.array(z.object({
      productId: z.string().uuid(),
      quantity: z.number().min(1),
      variantId: z.string().uuid().optional().nullable()
    })).optional(),
    note: z.string().optional(),
    couponCode: z.string().optional(),
    paymentMethod: z.enum(["BKASH", "CASH_ON_DELIVERY", "CARD"]).default("CASH_ON_DELIVERY"),
  }).refine((data) => data.addressId || data.guest, {
    message: "Either addressId or guest details must be provided",
    path: ["addressId"]
  })
});

const updateStatus = z.object({
  body: z.object({
    status: z.nativeEnum(OrderStatus),
    note: z.string().optional(),
    notifyCustomer: z.boolean().optional().default(true),
  }),
});

export const OrderValidation = { createOrder, updateStatus };
