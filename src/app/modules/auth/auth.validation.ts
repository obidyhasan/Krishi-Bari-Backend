import { z } from "zod";

const passwordSchema = z
  .string({ required_error: "Password is required" })
  .min(8, "Password must be at least 8 characters")
  .regex(
    /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/,
    "Password must include 1 uppercase, 1 number, and 1 special character"
  );

const register = z.object({
  body: z.object({
    name: z.string({ required_error: "Name is required" }).min(2).max(100),
    email: z.string({ required_error: "Email is required" }).email(),
    password: passwordSchema,
    phone: z.string().optional(),
  }),
});

const verifyEmail = z.object({
  body: z.object({
    email: z.string({ required_error: "Email is required" }).email(),
    otp: z.string({ required_error: "OTP is required" }).length(6),
  }),
});

const sendOtp = z.object({
  body: z.object({
    email: z.string({ required_error: "Email is required" }).email(),
  }),
});

const verifyOtp = z.object({
  body: z.object({
    email: z.string({ required_error: "Email is required" }).email(),
    otp: z.string({ required_error: "OTP is required" }).length(6),
  }),
});

const login = z.object({
  body: z.object({
    email: z.string({ required_error: "Email is required" }).email(),
    password: z.string({ required_error: "Password is required" }),
    rememberMe: z.boolean().optional(),
  }),
});

const adminVerifyTwoFactor = z.object({
  body: z.object({
    twoFactorToken: z.string({ required_error: "Two-factor token is required" }),
    otp: z.string({ required_error: "OTP is required" }).length(6),
  }),
});

const refreshToken = z.object({
  body: z.object({
    refreshToken: z.string().optional(),
  }),
});

const forgotPassword = z.object({
  body: z.object({
    email: z.string({ required_error: "Email is required" }).email(),
  }),
});

const resetPassword = z.object({
  body: z.object({
    email: z.string({ required_error: "Email is required" }).email(),
    otp: z.string({ required_error: "OTP is required" }).length(6),
    newPassword: passwordSchema,
  }),
});

const changePassword = z.object({
  body: z.object({
    oldPassword: z.string({ required_error: "Old password is required" }),
    newPassword: passwordSchema,
  }),
});

export const AuthValidation = {
  register,
  sendOtp,
  verifyOtp,
  verifyEmail,
  login,
  adminVerifyTwoFactor,
  refreshToken,
  forgotPassword,
  resetPassword,
  changePassword,
};
