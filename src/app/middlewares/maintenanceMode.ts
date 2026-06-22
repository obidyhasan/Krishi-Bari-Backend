import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { UserRole } from "@prisma/client";
import { SettingService } from "../modules/setting/setting.service";
import ApiError from "../errors/ApiError";

import { jwtHelper } from "../helper/jwtHelper";
import config from "../config";

const maintenanceMode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const isMaintenance = await SettingService.isMaintenanceMode();
    
    if (isMaintenance) {
      // Check for token in headers or cookies
      const token = req.headers.authorization || req.cookies?.accessToken;
      
      if (token) {
        try {
          const accessToken = token.startsWith("Bearer ") ? token.split(" ")[1] : token;
          const decoded = jwtHelper.verifyToken(accessToken, config.jwt.access_secret);
          if (decoded && (decoded.role === UserRole.ADMIN || decoded.role === UserRole.SUPER_ADMIN)) {
            return next();
          }
        } catch (err) {
          // Ignore token errors, just proceed to block if not admin
        }
      }

      // Allow health check and other essential routes if needed
      if (req.path === "/health" || req.path === "/" || req.path.includes("/admin/auth")) {
        return next();
      }

      throw new ApiError(httpStatus.SERVICE_UNAVAILABLE, "System is under maintenance. Please try again later.");
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

export default maintenanceMode;
