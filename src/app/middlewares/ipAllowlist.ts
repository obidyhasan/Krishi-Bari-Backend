import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { SettingService } from "../modules/setting/setting.service";
import ApiError from "../errors/ApiError";

let cachedIps: string[] | null = null;
let cacheAt = 0;
const CACHE_MS = 60 * 1000;

const getAllowedIps = async () => {
  if (cachedIps && Date.now() - cacheAt < CACHE_MS) return cachedIps;
  const setting = await SettingService.getSetting("ADMIN_IP_ALLOWLIST");
  cachedIps = (setting?.value || "")
    .split(",")
    .map((ip) => ip.trim())
    .filter(Boolean);
  cacheAt = Date.now();
  return cachedIps;
};

const ipAllowlist = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const allowedIps = await getAllowedIps();
    if (allowedIps.length === 0) {
      return next();
    }

    const clientIpRaw = req.ip || req.socket.remoteAddress || "";
    const clientIp = clientIpRaw.replace("::ffff:", "");

    if (allowedIps.includes(clientIp as string)) {
      return next();
    }

    throw new ApiError(httpStatus.FORBIDDEN, "Access denied: IP not allowed.");
  } catch (error) {
    next(error);
  }
};

export default ipAllowlist;
