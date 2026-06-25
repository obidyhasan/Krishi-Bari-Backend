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

const requestLogin = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.requestLogin(req.body.email);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

const verifyLogin = catchAsync(async (req: Request, res: Response) => {
  const { email, otp, rememberMe } = req.body;
  const result = await AuthService.verifyLogin(email, otp, rememberMe);
  
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
  requestLogin,
  verifyLogin,
  refreshToken,
  logout,
  getMe,
  getSocketToken,
};
