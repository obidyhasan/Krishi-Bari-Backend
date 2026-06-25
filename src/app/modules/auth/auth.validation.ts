import { z } from "zod";

const requestLogin = z.object({
  body: z.object({
    email: z.string({ required_error: "Email is required" }).email(),
  }),
});

const verifyLogin = z.object({
  body: z.object({
    email: z.string({ required_error: "Email is required" }).email(),
    otp: z.string({ required_error: "OTP is required" }).length(6),
    rememberMe: z.boolean().optional(),
  }),
});

const refreshToken = z.object({
  body: z.object({
    refreshToken: z.string().optional(),
  }),
});

export const AuthValidation = {
  requestLogin,
  verifyLogin,
  refreshToken,
};
