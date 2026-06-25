import { z } from "zod";

const submitContact = z.object({
  body: z.object({
    name: z
      .string({ required_error: "Name is required" })
      .trim()
      .min(2, "Name must be at least 2 characters")
      .max(80, "Name cannot exceed 80 characters"),
    email: z
      .string({ required_error: "Email is required" })
      .trim()
      .email("A valid email address is required")
      .max(160),
    subject: z
      .string({ required_error: "Subject is required" })
      .trim()
      .min(3, "Subject must be at least 3 characters")
      .max(160, "Subject cannot exceed 160 characters"),
    message: z
      .string({ required_error: "Message is required" })
      .trim()
      .min(10, "Message must be at least 10 characters")
      .max(3000, "Message cannot exceed 3000 characters"),
  }),
});

export const ContactValidation = { submitContact };
