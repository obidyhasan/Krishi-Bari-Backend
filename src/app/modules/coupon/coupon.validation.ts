import { z } from "zod";

const createCoupon = z.object({
  body: z.object({
    code: z
      .string({ required_error: "Code is required" })
      .min(3)
      .max(20)
      .transform((v) => v.trim().toUpperCase()),
    description: z.string().optional(),
    type: z.enum(["PERCENT", "FLAT", "FREE_DELIVERY"]).default("PERCENT"),
    value: z.number({ required_error: "Discount value required" }).positive(),
    minOrder: z.number().min(0).default(0),
    maxDiscount: z.number().positive().optional(),
    usageLimit: z.number().int().positive().optional(),
    isActive: z.boolean().default(true),
    expiresAt: z.coerce.date().optional(),
  }),
});

const updateCoupon = z.object({
  body: z.object({
    description: z.string().optional(),
    type: z.enum(["PERCENT", "FLAT", "FREE_DELIVERY"]).optional(),
    value: z.number().positive().optional(),
    minOrder: z.number().min(0).optional(),
    maxDiscount: z.number().positive().optional(),
    usageLimit: z.number().int().positive().optional(),
    isActive: z.boolean().optional(),
    expiresAt: z.coerce.date().optional(),
  }),
});

const validateCoupon = z.object({
  body: z.object({
    code: z
      .string({ required_error: "Coupon code required" })
      .transform((v) => v.trim().toUpperCase()),
    orderAmount: z.number({ required_error: "Order amount required" }).positive(),
  }),
});

export const CouponValidation = { createCoupon, updateCoupon, validateCoupon };
