import bcrypt from "bcrypt";
import httpStatus from "http-status";
import { UserStatus } from "@prisma/client";
import config from "../../config";
import ApiError from "../../errors/ApiError";
import { prisma } from "../../shared/prisma";
import { jwtHelper } from "../../helper/jwtHelper";
import { emailHelper } from "../../helper/emailHelper";
import { otpHelper } from "../../helper/otpHelper";
import { redisGuards } from "../../helper/redisGuards";

const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCKOUT_MS = 15 * 60 * 1000;
const MAX_OTP_RESENDS = 3;
const OTP_RESEND_WINDOW_MS = 10 * 60 * 1000;
const MAX_OTP_VERIFY_ATTEMPTS = 5;

const redisKeys = {
  loginLock: (email: string) => `auth:login:lock:${email}`,
  loginFail: (email: string) => `auth:login:fail:${email}`,
  otpResend: (id: string) => `auth:otp:resend:${id}`,
  otpLock: (id: string) => `auth:otp:lock:${id}`,
  otpFail: (id: string) => `auth:otp:fail:${id}`,
};

const recordFailedLoginAttempt = async (email: string) => {
  const count = await redisGuards.incrementWithinWindow(
    redisKeys.loginFail(email),
    LOGIN_LOCKOUT_MS,
  );
  if (count && count >= MAX_LOGIN_ATTEMPTS) {
    await redisGuards.lockFor(redisKeys.loginLock(email), LOGIN_LOCKOUT_MS);
  }
};

const clearLoginAttempts = async (email: string) => {
  await redisGuards.del([
    redisKeys.loginFail(email),
    redisKeys.loginLock(email),
  ]);
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

const authenticateCredentials = async (email: string, password: string) => {
  await redisGuards.assertNotLocked(
    redisKeys.loginLock(email),
    "Too many failed login attempts. Please try again in 15 minutes.",
  );

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    await recordFailedLoginAttempt(email);
    throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid email or password.");
  }

  if (user.status === UserStatus.BANNED)
    throw new ApiError(httpStatus.FORBIDDEN, "Your account has been banned.");

  if (user.status === UserStatus.INACTIVE) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "Your account is inactive. Please contact support.",
    );
  }

  const isPasswordMatch = await bcrypt.compare(password, user.password);
  if (!isPasswordMatch) {
    await recordFailedLoginAttempt(email);
    throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid email or password.");
  }

  await clearLoginAttempts(email);
  return user;
};

const register = async (payload: {
  name: string;
  email: string;
  password: string;
  phone?: string;
}) => {
  const existing = await prisma.user.findUnique({
    where: { email: payload.email },
  });

  if (existing?.isEmailVerified) {
    throw new ApiError(httpStatus.CONFLICT, "Email is already registered.");
  }

  if (payload.phone) {
    const existingPhone = await prisma.user.findUnique({
      where: { phone: payload.phone },
    });

    if (existingPhone && (!existing || existingPhone.id !== existing.id)) {
      throw new ApiError(httpStatus.CONFLICT, "Phone is already registered.");
    }
  }

  const hashedPassword = await bcrypt.hash(
    payload.password,
    config.bcrypt_salt_rounds,
  );
  const userSelect = {
    id: true,
    name: true,
    email: true,
    phone: true,
    role: true,
    isEmailVerified: true,
    createdAt: true,
  } as const;

  const user = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: {
          name: payload.name,
          password: hashedPassword,
          phone: payload.phone,
        },
        select: userSelect,
      })
    : await prisma.user.create({
        data: {
          name: payload.name,
          email: payload.email,
          password: hashedPassword,
          phone: payload.phone,
        },
        select: userSelect,
      });

  // Send OTP
  const otp = await otpHelper.saveOtp(payload.email, "verify");
  await emailHelper.sendEmail({
    to: payload.email,
    subject: "Verify Your Email - Krishi Bari",
    html: emailHelper.otpEmailTemplate(otp, config.otp_expires_in),
  });

  return user;
};

const verifyEmail = async (email: string, otp: string) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new ApiError(httpStatus.NOT_FOUND, "User not found.");
  if (user.isEmailVerified)
    throw new ApiError(httpStatus.BAD_REQUEST, "Email is already verified.");

  const identifier = `verify:${email}`;
  await redisGuards.assertNotLocked(
    redisKeys.otpLock(identifier),
    "Too many OTP attempts. Try again later.",
  );

  const isValid = await otpHelper.verifyOtp(otp, email, "verify");
  if (!isValid) {
    await trackFailedOtpAttempt(identifier);
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid or expired OTP.");
  }

  await clearOtpAttempts(identifier);

  await prisma.user.update({
    where: { email },
    data: { isEmailVerified: true },
  });

  return { message: "Email verified successfully." };
};

const login = async (
  email: string,
  password: string,
  rememberMe: boolean = false,
) => {
  const user = await authenticateCredentials(email, password);
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
      isEmailVerified: user.isEmailVerified,
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
  // Short-lived token used only for Socket.io handshake.
  // Client never sends userId; identity is derived from this signed token.
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

const forgotPassword = async (email: string) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new ApiError(httpStatus.NOT_FOUND, "User not found.");

  await trackOtpResend(`forgot:${email}`);
  const otp = await otpHelper.saveOtp(email, "reset");
  await emailHelper.sendEmail({
    to: email,
    subject: "Password Reset OTP - Krishi Bari",
    html: emailHelper.passwordResetTemplate(otp, config.otp_expires_in),
  });

  return { message: "OTP sent to your email." };
};

const resetPassword = async (
  email: string,
  otp: string,
  newPassword: string,
) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new ApiError(httpStatus.NOT_FOUND, "User not found.");

  await redisGuards.assertNotLocked(
    redisKeys.otpLock(`reset:${email}`),
    "Too many OTP attempts. Try again later.",
  );

  const isValid = await otpHelper.verifyOtp(otp, email, "reset");
  if (!isValid) {
    await trackFailedOtpAttempt(`reset:${email}`);
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid or expired OTP.");
  }

  await clearOtpAttempts(`reset:${email}`);

  const hashedPassword = await bcrypt.hash(
    newPassword,
    config.bcrypt_salt_rounds,
  );
  await prisma.user.update({
    where: { email },
    data: { password: hashedPassword, refreshToken: null },
  });

  return { message: "Password reset successfully." };
};

const changePassword = async (
  userId: string,
  oldPassword: string,
  newPassword: string,
) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ApiError(httpStatus.NOT_FOUND, "User not found.");

  const isMatch = await bcrypt.compare(oldPassword, user.password);
  if (!isMatch)
    throw new ApiError(httpStatus.BAD_REQUEST, "Old password is incorrect.");

  const hashed = await bcrypt.hash(newPassword, config.bcrypt_salt_rounds);
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashed, refreshToken: null },
  });

  return { message: "Password changed successfully." };
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

const sendOtp = async (email: string) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new ApiError(httpStatus.NOT_FOUND, "User not found.");
  if (user.isEmailVerified) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Email is already verified.");
  }

  await trackOtpResend(`verify:${email}`);
  const otp = await otpHelper.saveOtp(email, "verify");
  await emailHelper.sendEmail({
    to: email,
    subject: "Verify Your Email - Krishi Bari",
    html: emailHelper.otpEmailTemplate(otp, config.otp_expires_in),
  });
  return { message: "OTP sent successfully." };
};

const verifyOtp = async (email: string, otp: string) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new ApiError(httpStatus.NOT_FOUND, "User not found.");

  await redisGuards.assertNotLocked(
    redisKeys.otpLock(`verify:${email}`),
    "Too many OTP attempts. Try again later.",
  );

  const isValid = await otpHelper.verifyOtp(otp, email, "verify");
  if (!isValid) {
    await trackFailedOtpAttempt(`verify:${email}`);
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid or expired OTP.");
  }

  await clearOtpAttempts(`verify:${email}`);
  await prisma.user.update({
    where: { email },
    data: { isEmailVerified: true },
  });
  return { message: "OTP verified successfully." };
};

const adminLogin = async (email: string, password: string) => {
  const user = await authenticateCredentials(email, password);
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
    throw new ApiError(httpStatus.FORBIDDEN, "Admin access required.");
  }

  const otp = await otpHelper.saveOtp(user.email, "admin2fa");
  await emailHelper.sendEmail({
    to: user.email,
    subject: "Admin Login OTP - Krishi Bari",
    html: emailHelper.otpEmailTemplate(otp, config.otp_expires_in),
  });

  const twoFactorToken = jwtHelper.generateToken(
    { email: user.email, role: user.role, purpose: "ADMIN_2FA" },
    config.jwt.access_secret,
    "10m",
  );

  return {
    requiresTwoFactor: true,
    twoFactorToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
};

const verifyAdminTwoFactor = async (twoFactorToken: string, otp: string) => {
  let decoded: { email?: string; role?: string; purpose?: string };
  try {
    decoded = jwtHelper.verifyToken(
      twoFactorToken,
      config.jwt.access_secret,
    ) as { email?: string; role?: string; purpose?: string };
  } catch {
    throw new ApiError(
      httpStatus.UNAUTHORIZED,
      "Invalid or expired two-factor token.",
    );
  }

  if (decoded.purpose !== "ADMIN_2FA" || !decoded.email) {
    throw new ApiError(
      httpStatus.UNAUTHORIZED,
      "Invalid two-factor token payload.",
    );
  }

  const identifier = `admin2fa:${decoded.email}`;
  await redisGuards.assertNotLocked(
    redisKeys.otpLock(identifier),
    "Too many OTP attempts. Try again later.",
  );

  const user = await prisma.user.findUnique({
    where: { email: decoded.email },
  });
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
    throw new ApiError(httpStatus.FORBIDDEN, "Admin access required.");
  }

  const isValidOtp = await otpHelper.verifyOtp(otp, decoded.email, "admin2fa");
  if (!isValidOtp) {
    await trackFailedOtpAttempt(identifier);
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid or expired OTP.");
  }
  await clearOtpAttempts(identifier);

  const accessToken = jwtHelper.generateToken(
    { userId: user.id, email: user.email, role: user.role },
    config.jwt.access_secret,
    config.jwt.access_expires_in,
  );
  const refreshToken = jwtHelper.generateToken(
    { userId: user.id, email: user.email, role: user.role },
    config.jwt.refresh_secret,
    config.jwt.refresh_expires_in,
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
      isEmailVerified: user.isEmailVerified,
    },
  };
};

export const AuthService = {
  register,
  sendOtp,
  verifyOtp,
  verifyEmail,
  login,
  adminLogin,
  verifyAdminTwoFactor,
  refreshToken,
  forgotPassword,
  resetPassword,
  changePassword,
  logout,
  getMe,
  createSocketToken,
};
