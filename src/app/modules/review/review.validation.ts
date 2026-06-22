import { z } from "zod";

const createReview = z.object({
  body: z.object({
    productId: z.string({ required_error: "Product ID required" }).uuid(),
    orderId: z.string().uuid().optional(),
    rating: z.number({ required_error: "Rating required" }).int().min(1).max(5),
    comment: z.string().max(1000).optional(),
  }),
});

const updateReview = z.object({
  body: z.object({
    rating: z.number().int().min(1).max(5).optional(),
    comment: z.string().max(1000).optional(),
  }),
});

export const ReviewValidation = { createReview, updateReview };
