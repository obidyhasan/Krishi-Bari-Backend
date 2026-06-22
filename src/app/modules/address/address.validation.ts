import { z } from "zod";

const createAddress = z.object({
  body: z.object({
    label: z.string().default("Home"),
    fullName: z.string({ required_error: "Full name required" }).min(2),
    phone: z.string({ required_error: "Phone required" }),
    line1: z.string({ required_error: "Address line 1 required" }),
    line2: z.string().optional(),
    divisionId: z.string({ required_error: "Division is required" }),
    districtId: z.string({ required_error: "District is required" }),
    upazilaId: z.string({ required_error: "Upazila is required" }),
    postalCode: z.string({ required_error: "Postal code required" }),
    country: z.string().default("Bangladesh"),
    isDefault: z.boolean().optional(),
  }),
});

const updateAddress = z.object({
  body: z.object({
    label: z.string().optional(),
    fullName: z.string().min(2).optional(),
    phone: z.string().optional(),
    line1: z.string().optional(),
    line2: z.string().optional(),
    divisionId: z.string().optional(),
    districtId: z.string().optional(),
    upazilaId: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
    isDefault: z.boolean().optional(),
  }),
});

export const AddressValidation = { createAddress, updateAddress };
