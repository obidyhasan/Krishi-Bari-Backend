import { z } from "zod";
import { UserStatus } from "@prisma/client";

const updateProfile = z.object({
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    phone: z.string().optional(),
  }),
});

const updateUserStatus = z.object({
  body: z.object({
    status: z.nativeEnum(UserStatus),
  }),
});

export const UserValidation = { updateProfile, updateUserStatus };
