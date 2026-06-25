import { z } from "zod";

const optionalTrimmedString = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value === "" ? undefined : value));

const createFaq = z.object({
  body: z.object({
    question: z
      .string({ required_error: "Question is required" })
      .trim()
      .min(5, "Question must be at least 5 characters")
      .max(220, "Question cannot exceed 220 characters"),
    answer: z
      .string({ required_error: "Answer is required" })
      .trim()
      .min(10, "Answer must be at least 10 characters")
      .max(3000, "Answer cannot exceed 3000 characters"),
    category: z.string().trim().min(2).max(80).default("General"),
    sortOrder: z.number().int().min(0).default(0),
    isPublished: z.boolean().default(true),
  }),
});

const updateFaq = z.object({
  body: z.object({
    question: optionalTrimmedString(220),
    answer: optionalTrimmedString(3000),
    category: optionalTrimmedString(80),
    sortOrder: z.number().int().min(0).optional(),
    isPublished: z.boolean().optional(),
  }),
});

export const FaqValidation = { createFaq, updateFaq };
