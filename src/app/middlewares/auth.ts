import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { UserRole } from "@prisma/client";
import config from "../config";
import ApiError from "../errors/ApiError";
import catchAsync from "../shared/catchAsync";
import { jwtHelper } from "../helper/jwtHelper";
import { IJwtPayload } from "../types";

const auth = (...requiredRoles: UserRole[]) => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new ApiError(httpStatus.UNAUTHORIZED, "You are not authorized!");
    }

    const token = authHeader.split(" ")[1];

    let decoded: IJwtPayload;
    try {
      decoded = jwtHelper.verifyToken(
        token,
        config.jwt.access_secret
      ) as IJwtPayload;
    } catch {
      throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid or expired token!");
    }

    req.user = decoded;

    if (requiredRoles.length && !requiredRoles.includes(decoded.role)) {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        "You do not have permission to access this resource!"
      );
    }

    next();
  });
};

export default auth;
