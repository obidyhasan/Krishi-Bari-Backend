import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { AuthService } from "./auth.service";
import config from "../../config";
import ApiError from "../../errors/ApiError";

const REFRESH_COOKIE_NAME = "refreshToken";
const ACCESS_COOKIE_NAME = "accessToken";

const authCookieOptions = () => ({
  httpOnly: true,
  secure: config.node_env === "production",
  sameSite: "lax" as const,
  path: "/",
});

const extractCookie = (cookieHeader: string | undefined, key: string): string | null => {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";").map((part) => part.trim());
  const match = parts.find((part) => part.startsWith(`${key}=`));
  if (!match) return null;
  return decodeURIComponent(match.slice(key.length + 1));
};

const register = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.register(req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Registration successful. Please verify your email.",
    data: result,
  });
});

const sendOtp = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.sendOtp(req.body.email);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

const verifyOtp = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.verifyOtp(req.body.email, req.body.otp);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

const verifyEmail = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.verifyEmail(req.body.email, req.body.otp);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

const login = catchAsync(async (req: Request, res: Response) => {
  const { email, password, rememberMe } = req.body;
  const result = await AuthService.login(email, password, rememberMe);
  res.cookie(ACCESS_COOKIE_NAME, result.accessToken, {
    ...authCookieOptions(),
    maxAge: 15 * 60 * 1000,
  });
  res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, {
    ...authCookieOptions(),
    maxAge: (rememberMe ? 30 : 7) * 24 * 60 * 60 * 1000,
  });
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Login successful.",
    data: result,
  });
});

const adminLogin = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.adminLogin(req.body.email, req.body.password);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Admin login step 1 successful. Verify OTP to continue.",
    data: result,
  });
});

const verifyAdminTwoFactor = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.verifyAdminTwoFactor(
    req.body.twoFactorToken,
    req.body.otp
  );
  res.cookie(ACCESS_COOKIE_NAME, result.accessToken, {
    ...authCookieOptions(),
    maxAge: 15 * 60 * 1000,
  });
  res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, {
    ...authCookieOptions(),
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Admin 2FA verified successfully.",
    data: result,
  });
});

const refreshToken = catchAsync(async (req: Request, res: Response) => {
  const bodyRefreshToken = req.body?.refreshToken as string | undefined;
  const cookieRefreshToken = extractCookie(
    req.headers.cookie,
    REFRESH_COOKIE_NAME
  );
  const refreshTokenValue = bodyRefreshToken || cookieRefreshToken;
  if (!refreshTokenValue) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Refresh token is required.");
  }

  const result = await AuthService.refreshToken(refreshTokenValue);
  res.cookie(ACCESS_COOKIE_NAME, result.accessToken, {
    ...authCookieOptions(),
    maxAge: 15 * 60 * 1000,
  });
  res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, {
    ...authCookieOptions(),
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Token refreshed.",
    data: result,
  });
});

const forgotPassword = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.forgotPassword(req.body.email);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

const resetPassword = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.resetPassword(
    req.body.email,
    req.body.otp,
    req.body.newPassword
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

const changePassword = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.changePassword(
    req.user!.userId,
    req.body.oldPassword,
    req.body.newPassword
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

const logout = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.logout(req.user!.userId);
  res.clearCookie(ACCESS_COOKIE_NAME, authCookieOptions());
  res.clearCookie(REFRESH_COOKIE_NAME, authCookieOptions());
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

const getMe = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.getMe(req.user!.userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Profile fetched successfully.",
    data: result,
  });
});

const getSocketToken = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.createSocketToken(req.user!.userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Socket token issued.",
    data: result,
  });
});

export const AuthController = {
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
  getSocketToken,
};
