import type { NextFunction, Request, Response } from "express";
import { prisma } from "../shared/prisma";
import config from "../config";
import { jwtHelper } from "../helper/jwtHelper";

type AuditLoggerOptions = {
  /**
   * Only log mutating requests by default (POST/PUT/PATCH/DELETE).
   */
  logReads?: boolean;
  /**
   * Map request to an action name. Keep it stable for reporting.
   */
  actionForRequest?: (req: Request) => string;
  /**
   * Extract entity identity (optional).
   */
  entity?: (req: Request) => { entityType?: string; entityId?: string };
  /**
   * Attach extra structured metadata (optional).
   */
  meta?: (req: Request, res: Response) => any;
};

function isMutation(method: string) {
  return ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase());
}

export function auditLogger(opts: AuditLoggerOptions = {}) {
  const logReads = opts.logReads ?? false;

  return (req: Request, res: Response, next: NextFunction) => {
    const shouldLog = logReads || isMutation(req.method);
    if (!shouldLog) return next();

    const startedAt = Date.now();
    const action =
      opts.actionForRequest?.(req) ||
      `${req.method.toUpperCase()} ${req.baseUrl || ""}${req.path || ""}`.trim();
    const entity = opts.entity?.(req) || {};

    res.on("finish", () => {
      // Only log successful outcomes to reduce noise (tune as needed).
      if (res.statusCode >= 400) return;

      // Auth middleware may run after this logger depending on router ordering,
      // so resolve actor identity at response time.
      let actorId = req.user?.userId || null;
      let actorRole = (req.user?.role as any) || null;
      if (!actorId) {
        const authHeader = String(req.headers.authorization || "");
        if (authHeader.startsWith("Bearer ")) {
          const token = authHeader.slice("Bearer ".length).trim();
          try {
            const decoded = jwtHelper.verifyToken(token, config.jwt.access_secret) as any;
            actorId = decoded?.userId || null;
            actorRole = decoded?.role || null;
          } catch {
            // Ignore token parsing errors for audit identity.
          }
        }
      }
      const ip =
        (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ||
        req.ip ||
        null;
      const userAgent = String(req.headers["user-agent"] || "") || null;

      const meta = {
        durationMs: Date.now() - startedAt,
        ...(opts.meta ? { extra: opts.meta(req, res) } : {}),
      };

      prisma.auditLog
        .create({
          data: {
            actorId,
            actorRole,
            action,
            entityType: entity.entityType,
            entityId: entity.entityId,
            method: req.method.toUpperCase(),
            path: `${req.baseUrl || ""}${req.path || ""}` || req.originalUrl || "",
            ip,
            userAgent,
            statusCode: res.statusCode,
            meta,
          },
        })
        .catch(() => {
          // Non-blocking by design: never break request flow due to logging.
        });
    });

    return next();
  };
}

