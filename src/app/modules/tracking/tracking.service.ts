import { z } from "zod";
import { prisma } from "../../shared/prisma";
import { hashUserData, purchaseEventId } from "./hashing";
import { addToRetryQueue } from "./capiQueue";
import { logEvent } from "./eventLog.service";
import type { CAPIServerPayload, TrackingEventPayload } from "./tracking.types";

export const EventSchema = z.object({
  eventName: z.string().min(1).max(100),
  eventId: z.string().min(8),
  eventTime: z.number().int().positive().optional(),
  isCustom: z.boolean().optional(),
  contentIds: z.array(z.string()).optional(),
  contentType: z.string().optional(),
  contentName: z.string().optional(),
  contentCategory: z.string().optional(),
  value: z.number().nonnegative().optional(),
  currency: z.string().length(3).optional(),
  numItems: z.number().int().positive().optional(),
  orderId: z.string().optional(),
  fbp: z.string().optional(),
  fbc: z.string().optional(),
  userAgent: z.string().optional(),
  pageUrl: z.string().url().optional(),
});

export async function queueTrackingEvent(
  body: TrackingEventPayload,
  context: {
    ip: string;
    userAgent: string;
    userId?: string;
  },
) {
  const user = context.userId
    ? await prisma.user.findUnique({
        where: { id: context.userId },
        select: { id: true, email: true, phone: true, name: true },
      })
    : null;

  const [firstName, ...lastNameParts] = (user?.name || "").trim().split(/\s+/);
  const lastName = lastNameParts.join(" ");

  const userData = await hashUserData({
    email: user?.email,
    phone: user?.phone ?? undefined,
    firstName: firstName || undefined,
    lastName: lastName || undefined,
    ip: context.ip,
    userAgent: body.userAgent ?? context.userAgent,
    externalId: user?.id,
  });

  const capiPayload: CAPIServerPayload = {
    eventName: body.eventName,
    eventId: body.eventId,
    eventTime: body.eventTime ?? Math.floor(Date.now() / 1000),
    userData,
    customData: {
      content_ids: body.contentIds,
      content_type: body.contentType,
      content_name: body.contentName,
      content_category: body.contentCategory,
      value: body.value,
      currency: body.currency,
      num_items: body.numItems,
      order_id: body.orderId,
    },
    fbp: body.fbp,
    fbc: body.fbc,
    pageUrl: body.pageUrl,
    isCustom: body.isCustom,
    userId: context.userId,
    orderId: body.orderId,
  };

  await logEvent(capiPayload, "queued");
  await addToRetryQueue(capiPayload);
}

export async function queuePurchaseEventByOrderId(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: { select: { id: true, email: true, phone: true, name: true } },
      items: true,
    },
  });
  if (!order) return;

  const [firstName, ...lastNameParts] = order.user.name.trim().split(/\s+/);
  const payload: CAPIServerPayload = {
    eventName: "Purchase",
    eventId: purchaseEventId(order.id),
    eventTime: Math.floor(Date.now() / 1000),
    userData: await hashUserData({
      email: order.user.email,
      phone: order.user.phone ?? undefined,
      firstName: firstName || undefined,
      lastName: lastNameParts.join(" ") || undefined,
      externalId: order.user.id,
      ip: "0.0.0.0",
      userAgent: "server",
    }),
    customData: {
      content_ids: order.items.map((item) => item.productId),
      content_type: "product",
      value: order.total,
      currency: "BDT",
      num_items: order.items.length,
      order_id: order.id,
    },
    orderId: order.id,
    userId: order.user.id,
    pageUrl: undefined,
  };
  await logEvent(payload, "queued");
  await addToRetryQueue(payload);
}
