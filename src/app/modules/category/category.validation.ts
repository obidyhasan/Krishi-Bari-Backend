import { z } from "zod";

const create = z.object({
  body: z.object({
    name: z.string({ required_error: "Name is required" }).min(2),
    description: z.string().optional(),
    parentId: z.string().uuid().optional(),
    isActive: z.boolean().optional(),
  }),
});

const update = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    description: z.string().optional(),
    parentId: z.string().uuid().nullable().optional(),
    isActive: z.boolean().optional(),
  }),
});

export const CategoryValidation = { create, update };
