import { Router } from "express";
import rateLimit from "express-rate-limit";
import { TrackingController } from "./tracking.controller";

const router = Router();

const trackingLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many tracking events." },
});

router.post("/event", trackingLimiter, TrackingController.trackEvent);

export const TrackingRouter = router;
