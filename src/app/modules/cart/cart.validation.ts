import { z } from "zod";

const variantIdSchema = z.preprocess(
  (value) => (value === null ? undefined : value),
  z.string().uuid().optional()
);

const addItem = z.object({
  body: z.object({
    productId: z.string({ required_error: "Product ID required" }).uuid(),
    variantId: variantIdSchema,
    quantity: z.number().int().positive().default(1),
  }),
});

const updateItem = z.object({
  body: z.object({
    quantity: z.number({ required_error: "Quantity required" }).int().min(0),
  }),
});

const mergeCart = z.object({
  body: z.object({
    items: z
      .array(
        z.object({
          productId: z.string({ required_error: "Product ID required" }).uuid(),
          variantId: variantIdSchema,
          quantity: z.number({ required_error: "Quantity required" }).int().positive(),
        })
      )
      .max(50),
  }),
});

const syncCart = z.object({
  body: z.object({
    items: z
      .array(
        z.object({
          productId: z.string({ required_error: "Product ID required" }).uuid(),
          variantId: variantIdSchema,
          quantity: z.number({ required_error: "Quantity required" }).int().positive(),
        })
      )
      .max(50),
  }),
});

export const CartValidation = { addItem, updateItem, mergeCart, syncCart };
