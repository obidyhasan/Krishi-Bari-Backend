import express, { Application, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import crypto from "crypto";
import config from "./app/config";
import cookieParser from "cookie-parser";
import router from "./app/routers";
import globalErrorHandler from "./app/middlewares/globalErrorHandler";
import notFound from "./app/middlewares/notFound";
import maintenanceMode from "./app/middlewares/maintenanceMode";
import { prisma } from "./app/shared/prisma";
import { cloudinaryHelper } from "./app/helper/cloudinaryHelper";
import { getRedis } from "./app/shared/redis";
import { redisRateLimit } from "./app/middlewares/redisRateLimit";

const app: Application = express();
app.set("trust proxy", config.node_env === "production" ? 1 : false);
app.disable("x-powered-by");

function isAllowedOrigin(origin: string) {
  if (config.frontend_urls.includes(origin)) return true;
  if (config.node_env === "production") return false;

  // Dev convenience: treat localhost and 127.0.0.1 as equivalent for the same port.
  try {
    const o = new URL(origin);
    if (!["localhost", "127.0.0.1"].includes(o.hostname)) return false;
    const variants = new Set([
      `${o.protocol}//localhost${o.port ? `:${o.port}` : ""}`,
      `${o.protocol}//127.0.0.1${o.port ? `:${o.port}` : ""}`,
    ]);
    return config.frontend_urls.some((allowed) => variants.has(allowed));
  } catch {
    return false;
  }
}

// ── Security: SRD 5.2 ─────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    // Enable HSTS only in production (avoid confusing local/dev behavior).
    hsts:
      config.node_env === "production"
        ? { maxAge: 15552000, includeSubDomains: true }
        : false,
  })
);

// Redis-backed rate limiting (SRD expects Redis counters).
// If Redis is not configured, this degrades gracefully (no blocking).
app.use(
  "/api/v1",
  redisRateLimit({
    keyPrefix: "rl:global",
    windowMs: 15 * 60 * 1000,
    max: 100, // SRD baseline: 100 req / 15 min / IP
    message: "Too many requests, please try again later.",
  })
);

app.use(
  "/api/v1/auth",
  redisRateLimit({
    keyPrefix: "rl:auth",
    windowMs: 15 * 60 * 1000,
    max: 50,
    message: "Too many auth attempts, please try again later.",
  })
);

app.use(
  cors({
    origin(origin, callback) {
      // Allow same-origin and server-to-server calls without an Origin header.
      if (!origin) return callback(null, true);
      if (isAllowedOrigin(origin)) return callback(null, true);
      // Treat as forbidden rather than an unhandled error.
      const err: any = new Error("Not allowed by CORS");
      err.statusCode = 403;
      return callback(err);
    },
    credentials: true,
  })
);

// CSRF protection (cookie-based sessions):
// - For unsafe methods, if an Origin header is present, it must match the allowed frontend origin.
// - Bearer-token API calls typically won't be affected; this mainly protects cookie flows (refresh/logout).
app.use("/api/v1", (req, res, next) => {
  const method = req.method.toUpperCase();
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) return next();
  const origin = req.headers.origin;
  if (!origin) return next(); // server-to-server or tools like curl
  if (!isAllowedOrigin(origin)) {
    return res.status(403).json({ success: false, message: "Invalid request origin." });
  }
  return next();
});

// Parsers
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use((req, res, next) => {
  const headerId = req.headers["x-request-id"];
  const requestId = Array.isArray(headerId) ? headerId[0] : headerId;
  res.locals.requestId = requestId || crypto.randomUUID();
  res.setHeader("x-request-id", res.locals.requestId);
  next();
});

// Maintenance Mode: SRD 4.14
app.use("/api/v1", maintenanceMode);

// Routes
app.use("/api/v1", router);

// Health check
app.get("/api/v1/health", (req: Request, res: Response) => {
  const startedAt = Date.now();

  const checks = {
    db: { ok: true, message: "ok" as string },
    redis: { ok: false, message: "not configured" as string },
    cloudinary: { ok: true, message: "configured" as string },
  };

  prisma
    .$queryRaw`SELECT 1`
    .then(() => {
      checks.db = { ok: true, message: "ok" };
    })
    .catch((e: unknown) => {
      checks.db = { ok: false, message: (e as Error).message };
    })
    .finally(async () => {
      // Redis ping (SRD expects Redis-backed sessions/counters).
      const redis = getRedis();
      if (!redis) {
        checks.redis = { ok: false, message: "not configured" };
      } else {
        try {
          await redis.connect();
          const pong = await redis.ping();
          checks.redis = { ok: pong === "PONG", message: pong };
        } catch (e: unknown) {
          checks.redis = { ok: false, message: (e as Error).message };
        }
      }

      // Cloudinary: config presence check (upload test is intentionally skipped).
      if (!config.cloudinary.cloud_name || !config.cloudinary.api_key || !config.cloudinary.api_secret) {
        checks.cloudinary = { ok: false, message: "missing credentials" };
      } else {
        // Accessing helper ensures cloudinary config is loaded.
        void cloudinaryHelper;
        checks.cloudinary = { ok: true, message: "configured" };
      }

      const ok = checks.db.ok && checks.redis.ok && checks.cloudinary.ok;
      res.status(ok ? 200 : 503).json({
        success: ok,
        message: ok ? "Healthy" : "Unhealthy",
        environment: config.node_env,
        uptime: process.uptime().toFixed(2) + " seconds",
        timestamp: new Date().toISOString(),
        latencyMs: Date.now() - startedAt,
        checks,
      });
    });
});

app.get("/", (req: Request, res: Response) => {
  res.json({
    message: "Krishi Bari API Server",
    version: "1.0.0",
    environment: config.node_env,
    uptime: process.uptime().toFixed(2) + " seconds",
    timestamp: new Date().toISOString(),
  });
});

// Error handlers
app.use(globalErrorHandler);
app.use(notFound);

export default app;
