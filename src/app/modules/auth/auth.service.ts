import bcrypt from "bcrypt";
import crypto from "crypto";
import httpStatus from "http-status";
import { UserStatus, UserRole } from "@prisma/client";
import config from "../../config";
import ApiError from "../../errors/ApiError";
import { prisma } from "../../shared/prisma";
import { jwtHelper } from "../../helper/jwtHelper";
import { emailHelper } from "../../helper/emailHelper";
import { otpHelper } from "../../helper/otpHelper";
import { redisGuards } from "../../helper/redisGuards";

const MAX_OTP_RESENDS = 3;
const OTP_RESEND_WINDOW_MS = 10 * 60 * 1000;
const MAX_OTP_VERIFY_ATTEMPTS = 5;
const LOGIN_LOCKOUT_MS = 15 * 60 * 1000;

const redisKeys = {
  otpResend: (id: string) => `auth:otp:resend:${id}`,
  otpLock: (id: string) => `auth:otp:lock:${id}`,
  otpFail: (id: string) => `auth:otp:fail:${id}`,
};

const trackOtpResend = async (identifier: string) => {
  const count = await redisGuards.incrementWithinWindow(
    redisKeys.otpResend(identifier),
    OTP_RESEND_WINDOW_MS,
  );
  if (count && count > MAX_OTP_RESENDS) {
    throw new ApiError(
      httpStatus.TOO_MANY_REQUESTS,
      "OTP resend limit reached. Please try again after 10 minutes.",
    );
  }
};

const trackFailedOtpAttempt = async (identifier: string) => {
  const count = await redisGuards.incrementWithinWindow(
    redisKeys.otpFail(identifier),
    LOGIN_LOCKOUT_MS,
  );
  if (count && count >= MAX_OTP_VERIFY_ATTEMPTS) {
    await redisGuards.lockFor(redisKeys.otpLock(identifier), LOGIN_LOCKOUT_MS);
  }
};

const clearOtpAttempts = async (identifier: string) => {
  await redisGuards.del([
    redisKeys.otpFail(identifier),
    redisKeys.otpLock(identifier),
  ]);
};

const requestLogin = async (email: string) => {
  const normalizedEmail = email.trim().toLowerCase();
  
  let user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    // Generate a secure random password since schema requires it
    const generatedPassword = crypto.randomBytes(32).toString("base64url");
    const hashedPassword = await bcrypt.hash(
      generatedPassword,
      config.bcrypt_salt_rounds,
    );

    user = await prisma.user.create({
      data: {
        name: normalizedEmail.split("@")[0],
        email: normalizedEmail,
        password: hashedPassword,
        role: UserRole.CUSTOMER,
        isEmailVerified: false,
      },
    });
  }

  if (user.status === UserStatus.BANNED) {
    throw new ApiError(httpStatus.FORBIDDEN, "Your account has been banned.");
  }
  if (user.status === UserStatus.INACTIVE) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "Your account is inactive. Please contact support.",
    );
  }

  await trackOtpResend(`login:${normalizedEmail}`);
  
  const otp = await otpHelper.saveOtp(normalizedEmail, "login");
  await emailHelper.sendEmail({
    to: normalizedEmail,
    subject: "Login Code - Krishi Bari",
    html: emailHelper.otpEmailTemplate(otp, config.otp_expires_in),
  });

  return { message: "An OTP has been sent to your email." };
};

const verifyLogin = async (email: string, otp: string, rememberMe: boolean = false) => {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found.");
  }
  
  if (user.status === UserStatus.BANNED) {
    throw new ApiError(httpStatus.FORBIDDEN, "Your account has been banned.");
  }

  const identifier = `login:${normalizedEmail}`;
  await redisGuards.assertNotLocked(
    redisKeys.otpLock(identifier),
    "Too many OTP attempts. Try again later.",
  );

  const isValid = await otpHelper.verifyOtp(otp, normalizedEmail, "login");
  if (!isValid) {
    await trackFailedOtpAttempt(identifier);
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid or expired OTP.");
  }

  await clearOtpAttempts(identifier);

  // Update email verified status if it was false
  if (!user.isEmailVerified) {
    await prisma.user.update({
      where: { id: user.id },
      data: { isEmailVerified: true },
    });
  }

  const accessToken = jwtHelper.generateToken(
    { userId: user.id, email: user.email, role: user.role },
    config.jwt.access_secret,
    config.jwt.access_expires_in,
  );

  const refreshToken = jwtHelper.generateToken(
    { userId: user.id, email: user.email, role: user.role },
    config.jwt.refresh_secret,
    rememberMe ? "30d" : "7d",
  );

  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken },
  });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      isEmailVerified: true,
    },
  };
};

const refreshToken = async (token: string) => {
  let decoded;
  try {
    decoded = jwtHelper.verifyToken(token, config.jwt.refresh_secret);
  } catch {
    throw new ApiError(
      httpStatus.UNAUTHORIZED,
      "Invalid or expired refresh token.",
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
  });

  if (!user || user.refreshToken !== token) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid refresh token.");
  }

  const accessToken = jwtHelper.generateToken(
    { userId: user.id, email: user.email, role: user.role },
    config.jwt.access_secret,
    config.jwt.access_expires_in,
  );

  const newRefreshToken = jwtHelper.generateToken(
    { userId: user.id, email: user.email, role: user.role },
    config.jwt.refresh_secret,
    config.jwt.refresh_expires_in,
  );

  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken: newRefreshToken },
  });

  return { accessToken, refreshToken: newRefreshToken };
};

const createSocketToken = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true, status: true },
  });
  if (!user || user.status !== "ACTIVE") {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Unauthorized.");
  }

  const token = jwtHelper.generateToken(
    { userId: user.id, email: user.email, role: user.role, typ: "socket" },
    config.jwt.access_secret,
    "60s",
  );
  return { token, expiresInSeconds: 60 };
};

const logout = async (userId: string) => {
  await prisma.user.update({
    where: { id: userId },
    data: { refreshToken: null },
  });
  return { message: "Logged out successfully." };
};

const getMe = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      isEmailVerified: true,
    },
  });
  if (!user) throw new ApiError(httpStatus.NOT_FOUND, "User not found.");
  return user;
};

export const AuthService = {
  requestLogin,
  verifyLogin,
  refreshToken,
  logout,
  getMe,
  createSocketToken,
};
