import { Request, Response } from "express";
import httpStatus from "http-status";
import config from "../../config";
import { jwtHelper } from "../../helper/jwtHelper";
import { EventSchema, queueTrackingEvent } from "./tracking.service";

function tryGetUserIdFromAuthHeader(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return undefined;
  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwtHelper.verifyToken(token, config.jwt.access_secret) as {
      userId?: string;
    };
    return decoded.userId;
  } catch {
    return undefined;
  }
}

const trackEvent = async (req: Request, res: Response) => {
  res.status(httpStatus.ACCEPTED).json({ status: "accepted" });

  const parsed = EventSchema.safeParse(req.body);
  if (!parsed.success) {
    console.warn("[Tracking] Invalid payload", parsed.error.flatten());
    return;
  }

  const ip =
    (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ||
    req.ip ||
    "0.0.0.0";
  const userId = tryGetUserIdFromAuthHeader(req);

  try {
    await queueTrackingEvent(parsed.data, {
      ip,
      userAgent: req.headers["user-agent"] || "",
      userId,
    });
  } catch (error) {
    console.error("[Tracking] Queue error", error);
  }
};

export const TrackingController = {
  trackEvent,
};
