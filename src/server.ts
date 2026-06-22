import { createServer } from "http";
import { Server as SocketServer } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import Redis from "ioredis";
import app from "./app";
import config from "./app/config";
import { prisma } from "./app/shared/prisma";
import { startCapiWorker } from "./app/modules/tracking/capiQueue";
import { jwtHelper } from "./app/helper/jwtHelper";

async function bootstrap() {
  const httpServer = createServer(app);

  // ── Socket.io setup ──────────────────────────────────────────────────────
  const io = new SocketServer(httpServer, {
    cors: {
      origin: config.frontend_url,
      credentials: true,
    },
    transports: ["websocket"],
  });

  // Optional scalability: Redis adapter for multi-node Socket.io deployments.
  // Enabled when REDIS_URL is configured.
  if (config.redis_url) {
    try {
      const pubClient = new Redis(config.redis_url, { lazyConnect: true });
      const subClient = pubClient.duplicate();
      await pubClient.connect();
      await subClient.connect();
      io.adapter(createAdapter(pubClient, subClient));
      console.log("🧩 Socket.io Redis adapter enabled");
    } catch (e) {
      console.warn("⚠️  Failed to enable Socket.io Redis adapter, continuing without it.");
    }
  }

  // Authenticate sockets using the same access JWT as the HTTP API.
  // Never trust client-provided identity (e.g., userId); derive it from a verified token.
  io.use(async (socket, next) => {
    try {
      const authHeader = socket.handshake.headers?.authorization;
      const cookieHeader = String(socket.handshake.headers?.cookie || "");
      const accessCookieMatch = cookieHeader
        .split(";")
        .map((p) => p.trim())
        .find((p) => p.startsWith("accessToken="));
      const cookieToken = accessCookieMatch
        ? decodeURIComponent(accessCookieMatch.slice("accessToken=".length))
        : "";
      const rawToken =
        (typeof socket.handshake.auth?.token === "string" &&
          socket.handshake.auth.token.trim()) ||
        (cookieToken && cookieToken.trim()) ||
        (typeof authHeader === "string" && authHeader.startsWith("Bearer ")
          ? authHeader.slice("Bearer ".length).trim()
          : "");

      if (!rawToken) return next(new Error("Unauthorized"));

      const decoded = jwtHelper.verifyToken(
        rawToken,
        config.jwt.access_secret
      ) as { userId?: string; role?: string };
      const userId = String(decoded?.userId || "").trim();
      if (!userId) return next(new Error("Unauthorized"));

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, status: true },
      });
      if (!user || user.status !== "ACTIVE") return next(new Error("Unauthorized"));

      (socket.data as any).userId = user.id;
      return next();
    } catch {
      return next(new Error("Unauthorized"));
    }
  });

  // Make io accessible in request handlers via app.locals
  app.locals.io = io;

  io.on("connection", (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // Customer subscribes to their order's room
    socket.on("join:order", async (orderId: string) => {
      const userId = String((socket.data as any).userId || "").trim();
      if (!orderId || !userId) return;

      const order = await prisma.order.findFirst({
        where: { id: orderId, userId },
        select: { id: true },
      });
      if (!order) return;

      socket.join(`order:${orderId}`);
      console.log(`   ↳ Joined room order:${orderId} by user:${userId}`);
    });

    // Customer leaves order room
    socket.on("leave:order", (orderId: string) => {
      socket.leave(`order:${orderId}`);
    });

    socket.on("disconnect", () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });

  // ── Start server ─────────────────────────────────────────────────────────
  httpServer.listen(config.port, () => {
    console.log(`🚀 Krishi Bari API running on http://localhost:${config.port}`);
    console.log(`📡 Socket.io ready`);
    console.log(`🌍 Environment: ${config.node_env}`);
  });
  startCapiWorker();

  // ── Graceful shutdown ─────────────────────────────────────────────────────
  const exitHandler = () => {
    httpServer.close(() => {
      console.log("Server closed gracefully.");
      process.exit(0);
    });
  };

  process.on("unhandledRejection", (error) => {
    console.error("Unhandled Rejection detected, shutting down...", error);
    httpServer.close(() => process.exit(1));
  });

  process.on("SIGTERM", exitHandler);
  process.on("SIGINT", exitHandler);
}

bootstrap();
