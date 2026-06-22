import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { redisGuards } from "../helper/redisGuards";

type RedisRateLimitOptions = {
  keyPrefix: string;
  windowMs: number;
  max: number;
  message?: string;
  /**
   * Optional key customizer (defaults to req.ip).
   * Use only stable identifiers (e.g., IP, userId) — never trust client-provided IDs.
   */
  keyForRequest?: (req: Request) => string;
};

export function redisRateLimit(opts: RedisRateLimitOptions) {
  const message =
    opts.message || "Too many requests, please try again later.";

  return async (req: Request, res: Response, next: NextFunction) => {
    const keyPart = (opts.keyForRequest ? opts.keyForRequest(req) : req.ip) || "unknown";
    const key = `${opts.keyPrefix}:${keyPart}`;

    const count = await redisGuards.incrementWithinWindow(key, opts.windowMs);
    // If Redis is not configured/unavailable, degrade gracefully (do not block).
    if (count === null) return next();

    if (count > opts.max) {
      return res.status(httpStatus.TOO_MANY_REQUESTS).json({
        success: false,
        message,
      });
    }

    res.setHeader("x-ratelimit-limit", String(opts.max));
    res.setHeader("x-ratelimit-remaining", String(Math.max(opts.max - count, 0)));
    return next();
  };
}

