import { EventStatus, Prisma } from "@prisma/client";
import { prisma } from "../../shared/prisma";
import type { CAPIServerPayload } from "./tracking.types";

export async function logEvent(
  payload: CAPIServerPayload,
  status: "queued" | "delivered" | "failed" | "failed_permanent" = "queued",
) {
  return prisma.trackingEvent.upsert({
    where: { eventId: payload.eventId },
    update: {
      status: status.toUpperCase() as EventStatus,
      payload: payload as unknown as Prisma.InputJsonValue,
      orderId: payload.orderId,
      pageUrl: payload.pageUrl,
      value: payload.customData?.value,
      currency: payload.customData?.currency,
    },
    create: {
      eventId: payload.eventId,
      eventName: payload.eventName,
      eventTime: new Date(payload.eventTime * 1000),
      status: status.toUpperCase() as EventStatus,
      userId: payload.userId,
      orderId: payload.orderId,
      pageUrl: payload.pageUrl,
      value: payload.customData?.value,
      currency: payload.customData?.currency,
      payload: payload as unknown as Prisma.InputJsonValue,
    },
  });
}

export async function updateEventStatus(
  eventId: string,
  status: "delivered" | "failed" | "failed_permanent",
  attempts: number,
  errorMessage?: string,
) {
  return prisma.trackingEvent.update({
    where: { eventId },
    data: {
      status: status.toUpperCase() as EventStatus,
      attempts,
      lastAttempt: new Date(),
      errorMessage,
    },
  });
}
