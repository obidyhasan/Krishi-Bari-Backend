import { z } from "zod";

const booleanCoerce = z.preprocess(
  (v) => v === "true" || v === true,
  z.boolean().default(false)
);

const booleanCoerceOptional = z.preprocess(
  (v) => (v === undefined ? undefined : v === "true" || v === true),
  z.boolean().optional()
);

const positiveNullableNumber = z.preprocess(
  (v) => (v === "" || v === null || v === undefined || Number.isNaN(Number(v)) ? null : Number(v)),
  z.number().positive().nullable().optional()
);

const create = z.object({
  body: z.object({
    name: z.string({ required_error: "Name is required" }).min(2),
    description: z.string().optional(),
    price: z.coerce.number({ required_error: "Price is required" }).positive(),
    salePrice: positiveNullableNumber,
    sku: z.string({ required_error: "SKU is required" }),
    stock: z.coerce.number().int().min(0).default(0),
    unit: z.string().default("kg"),
    weight: positiveNullableNumber,
    categoryId: z.string({ required_error: "Category is required" }).uuid(),
    isFeatured: booleanCoerce,
    status: z.enum(["DRAFT", "ACTIVE", "OUT_OF_STOCK", "DISCONTINUED"]).default("ACTIVE"),
  }),
});

const update = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    description: z.string().optional(),
    price: z.coerce.number().positive().optional(),
    salePrice: positiveNullableNumber,
    sku: z.string().optional(),
    stock: z.coerce.number().int().min(0).optional(),
    unit: z.string().optional(),
    weight: positiveNullableNumber,
    categoryId: z.string().uuid().optional(),
    isFeatured: booleanCoerceOptional,
    status: z.enum(["DRAFT", "ACTIVE", "OUT_OF_STOCK", "DISCONTINUED"]).optional(),
  }),
});

export const ProductValidation = { create, update };
