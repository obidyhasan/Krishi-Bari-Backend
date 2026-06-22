import fs from "fs";
import path from "path";
import crypto from "crypto";
import bcrypt from "bcrypt";
import httpStatus from "http-status";
import {
  OrderStatus,
  PaymentMethod,
  ProductStatus,
  UserRole,
} from "@prisma/client";
import { Server as SocketServer } from "socket.io";
import config from "../../config";
import { prisma } from "../../shared/prisma";
import ApiError from "../../errors/ApiError";
import { paginationHelper, IOptions } from "../../helper/paginationHelper";
import { orderHelper } from "../../helper/orderHelper";
import { emailHelper } from "../../helper/emailHelper";
import { smsHelper } from "../../helper/smsHelper";
import { pdfHelper } from "../../helper/pdfHelper";
import { jwtHelper } from "../../helper/jwtHelper";
import { purchaseEventId } from "../tracking/hashing";
import { queuePurchaseEventByOrderId } from "../tracking/tracking.service";

const COD_MAX_AMOUNT = Number(process.env.COD_MAX_AMOUNT) || 5000;

type CheckoutItem = {
  productId: string;
  quantity: number;
  variantId?: string | null;
};
type CheckoutPayload = {
  addressId?: string;
  guest?: {
    name: string;
    phone: string;
    email: string;
    address: string;
  };
  cartItems?: CheckoutItem[];
  note?: string;
  couponCode?: string;
  deliverySlot?: string;
  paymentMethod: string;
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const issueAuthTokens = async (user: {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  avatar?: string | null;
  isEmailVerified: boolean;
}) => {
  const accessToken = jwtHelper.generateToken(
    { userId: user.id, email: user.email, role: user.role },
    config.jwt.access_secret,
    config.jwt.access_expires_in,
  );
  const refreshToken = jwtHelper.generateToken(
    { userId: user.id, email: user.email, role: user.role },
    config.jwt.refresh_secret,
    config.jwt.refresh_expires_in,
  );

  await prisma.user.update({ where: { id: user.id }, data: { refreshToken } });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      isEmailVerified: user.isEmailVerified,
    },
  };
};

const ensureCheckoutUser = async (
  userId: string | undefined,
  payload: CheckoutPayload,
) => {
  if (userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new ApiError(httpStatus.NOT_FOUND, "User not found.");
    return {
      user,
      auth: undefined as
        | Awaited<ReturnType<typeof issueAuthTokens>>
        | undefined,
    };
  }

  if (!payload.guest) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Guest checkout details are required.",
    );
  }

  const email = normalizeEmail(payload.guest.email);
  let user = await prisma.user.findUnique({ where: { email } });
  let isNewUser = false;

  if (!user) {
    if (payload.guest.phone) {
      const existingPhone = await prisma.user.findUnique({
        where: { phone: payload.guest.phone },
      });
      if (existingPhone)
        throw new ApiError(httpStatus.CONFLICT, "Phone is already registered.");
    }

    const generatedPassword = crypto.randomBytes(32).toString("base64url");
    user = await prisma.user.create({
      data: {
        name: payload.guest.name.trim(),
        email,
        phone: payload.guest.phone.trim(),
        password: await bcrypt.hash(
          generatedPassword,
          config.bcrypt_salt_rounds,
        ),
        role: UserRole.CUSTOMER,
      },
    });
    isNewUser = true;
  }

  if (user.status === "BANNED" || user.status === "INACTIVE") {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "This account cannot place orders.",
    );
  }

  return { 
    user, 
    auth: isNewUser ? await issueAuthTokens(user) : undefined 
  };
};

const createCheckoutAddress = async (
  userId: string,
  payload: CheckoutPayload,
) => {
  if (payload.addressId) {
    const address = await prisma.address.findFirst({
      where: { id: payload.addressId, userId },
    });
    if (!address)
      throw new ApiError(httpStatus.NOT_FOUND, "Address not found.");
    return address.id;
  }

  if (!payload.guest) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Delivery address is required.");
  }

  const [division, district, upazila] = await Promise.all([
    prisma.division.findFirst({ orderBy: { createdAt: "asc" } }),
    prisma.district.findFirst({ orderBy: { createdAt: "asc" } }),
    prisma.upazila.findFirst({ orderBy: { createdAt: "asc" } }),
  ]);
  if (!division || !district || !upazila) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Delivery area data is not configured.",
    );
  }

  const address = await prisma.address.create({
    data: {
      userId,
      label: "Checkout",
      fullName: payload.guest.name.trim(),
      phone: payload.guest.phone.trim(),
      line1: payload.guest.address.trim(),
      divisionId: division.id,
      districtId: district.id,
      upazilaId: upazila.id,
      postalCode: "0000",
      isDefault: false,
    },
  });
  return address.id;
};

const syncCheckoutCart = async (userId: string, items?: CheckoutItem[]) => {
  if (!items?.length) return;
  const normalized = items.slice(0, 50).map((item) => ({
    productId: item.productId,
    variantId: item.variantId ?? null,
    quantity: Math.max(1, Math.floor(item.quantity)),
  }));

  await prisma.$transaction(async (tx) => {
    const cart = await tx.cart.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
    const unique = new Map<string, (typeof normalized)[0]>();
    for (const item of normalized)
      unique.set(`${item.productId}:${item.variantId ?? ""}`, item);
    await tx.cartItem.createMany({
      data: Array.from(unique.values()).map((item) => ({
        ...item,
        cartId: cart.id,
      })),
      skipDuplicates: true,
    });
  });
};

const createOrder = async (
  userId: string | undefined,
  payload: CheckoutPayload,
) => {
  const { user: userData, auth } = await ensureCheckoutUser(userId, payload);
  const effectiveUserId = userData.id;
  const addressId = await createCheckoutAddress(effectiveUserId, payload);
  await syncCheckoutCart(effectiveUserId, payload.cartItems);

  // Get cart (include variant to read variant-specific price & SKU)
  const cart = await prisma.cart.findUnique({
    where: { userId: effectiveUserId },
    include: {
      items: {
        include: {
          product: true,
          variant: true,
        },
      },
    },
  });
  if (!cart || cart.items.length === 0)
    throw new ApiError(httpStatus.BAD_REQUEST, "Your cart is empty.");

  // Stock validation will be done inside transaction

  // Calculate totals — use variant price when available
  let subtotal = cart.items.reduce((sum, item) => {
    const price = item.variant?.price ?? item.product.salePrice ?? item.product.price;
    return sum + price * item.quantity;
  }, 0);

  let discount = 0;
  let couponId: string | undefined;

  if (payload.couponCode) {
    const coupon = await prisma.coupon.findFirst({
      where: { code: payload.couponCode.trim().toUpperCase(), isActive: true },
    });
    if (!coupon)
      throw new ApiError(httpStatus.BAD_REQUEST, "Invalid or expired coupon.");
    if (coupon.expiresAt && coupon.expiresAt < new Date())
      throw new ApiError(httpStatus.BAD_REQUEST, "Coupon has expired.");
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit)
      throw new ApiError(httpStatus.BAD_REQUEST, "Coupon usage limit reached.");
    if (subtotal < coupon.minOrder)
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Minimum order amount is ৳${coupon.minOrder}.`,
      );

    const prevUsage = await prisma.couponUsage.findUnique({
      where: {
        couponId_userId: { couponId: coupon.id, userId: effectiveUserId },
      },
    });
    if (prevUsage)
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "You have already used this coupon.",
      );

    discount =
      coupon.type === "PERCENT"
        ? (subtotal * coupon.value) / 100
        : coupon.value;

    if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
    discount = Math.max(0, Math.min(discount, subtotal));
    couponId = coupon.id;
  }

  const deliveryFee = 60; // flat rate, configurable
  const total = Math.max(0, subtotal - discount + deliveryFee);

  if (
    payload.paymentMethod === PaymentMethod.CASH_ON_DELIVERY &&
    total > COD_MAX_AMOUNT
  ) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Cash on Delivery is only available up to ${COD_MAX_AMOUNT}.`,
    );
  }

  // Create order in transaction
  const order = await prisma.$transaction(
    async (tx) => {
      // Fetch latest cart with product + variant stock inside transaction
      const latestCart = await tx.cart.findUnique({
        where: { userId: effectiveUserId },
        include: {
          items: {
            include: {
              product: true,
              variant: true,
            },
          },
        },
      });
      if (!latestCart || latestCart.items.length === 0) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Your cart is empty.");
      }

      // Validate stock inside transaction to prevent race conditions
      for (const item of latestCart.items) {
        if (item.product.status !== ProductStatus.ACTIVE) {
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            `${item.product.name} is no longer available.`,
          );
        }
        // Validate variant stock if variant exists, otherwise base product stock
        const availableStock = item.variant ? item.variant.stock : item.product.stock;
        if (availableStock < item.quantity) {
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            `Insufficient stock for ${item.product.name}${item.variant ? ` (${item.variant.value})` : ""}.`,
          );
        }
      }

      // Use latest cart items for order creation
      const cart = latestCart;

      // Recalculate totals based on latest cart — use variant price when available
      const subtotal = cart.items.reduce((sum, item) => {
        const price = item.variant?.price ?? item.product.salePrice ?? item.product.price;
        return sum + price * item.quantity;
      }, 0);

      let discount = 0;
      let couponId: string | undefined;

      if (payload.couponCode) {
        const coupon = await tx.coupon.findFirst({
          where: {
            code: payload.couponCode.trim().toUpperCase(),
            isActive: true,
          },
        });
        if (!coupon) {
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            "Invalid or expired coupon.",
          );
        }
        if (coupon.expiresAt && coupon.expiresAt < new Date()) {
          throw new ApiError(httpStatus.BAD_REQUEST, "Coupon has expired.");
        }
        if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            "Coupon usage limit reached.",
          );
        }
        if (subtotal < coupon.minOrder) {
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            `Minimum order amount is ৳${coupon.minOrder}.`,
          );
        }

        const prevUsage = await tx.couponUsage.findUnique({
          where: {
            couponId_userId: { couponId: coupon.id, userId: effectiveUserId },
          },
        });
        if (prevUsage) {
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            "You have already used this coupon.",
          );
        }

        discount =
          coupon.type === "PERCENT"
            ? (subtotal * coupon.value) / 100
            : coupon.value;

        if (coupon.maxDiscount)
          discount = Math.min(discount, coupon.maxDiscount);
        discount = Math.max(0, Math.min(discount, subtotal));
        couponId = coupon.id;
      }

      const deliveryFee = 60; // flat rate, configurable
      const total = Math.max(0, subtotal - discount + deliveryFee);

      if (
        payload.paymentMethod === PaymentMethod.CASH_ON_DELIVERY &&
        total > COD_MAX_AMOUNT
      ) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          `Cash on Delivery is only available up to ${COD_MAX_AMOUNT}.`,
        );
      }

      const newOrder = await tx.order.create({
        data: {
          orderNumber: orderHelper.generateOrderNumber(),
          userId: effectiveUserId,
          addressId,
          notes: payload.note,
          deliverySlot: payload.deliverySlot,
          subtotal,
          discount,
          deliveryFee,
          total,
          couponId,
          paymentMethod: payload.paymentMethod as PaymentMethod,
          items: {
            create: cart.items.map((item) => ({
              productId: item.productId,
              variantId: item.variantId ?? null,
              quantity: item.quantity,
              // Snapshot: use variant price if available, else sale/regular price
              price: item.variant?.price ?? item.product.salePrice ?? item.product.price,
              name: item.product.name,
              // Snapshot image from the first product image
              imageUrl: (item.product as any).images?.[0]?.url ?? null,
              // Variant snapshot — immutable record even if variant is later deleted
              variantName: item.variant?.name ?? null,
              variantValue: item.variant?.value ?? null,
              variantSku: item.variant?.sku ?? null,
            })),
          },
          payment: {
            create: {
              method: payload.paymentMethod as PaymentMethod,
              amount: total,
            },
          },
          tracking: {
            create: {
              status: OrderStatus.PENDING,
              message: "Order placed successfully.",
            },
          },
        },
        include: {
          items: true,
          payment: true,
          address: {
            include: { division: true, district: true, upazila: true },
          },
        },
      });

      // In-app notification: order placed
      await tx.notification.create({
        data: {
          userId: effectiveUserId,
          title: "Order placed",
          message: `Your order #${newOrder.orderNumber} has been placed successfully.`,
          type: "ORDER",
          data: {
            orderId: newOrder.id,
            orderNumber: newOrder.orderNumber,
            status: OrderStatus.PENDING,
          },
        },
      });

      const admins = await tx.user.findMany({
        where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } },
        select: { id: true },
      });

      // Deduct stock and check for low stock alert
      for (const item of cart.items) {
        if (item.variantId && item.variant) {
          // Decrement variant-specific stock
          const variantStockUpdate = await tx.productVariant.updateMany({
            where: { id: item.variantId, stock: { gte: item.quantity } },
            data: { stock: { decrement: item.quantity } },
          });
          if (variantStockUpdate.count !== 1) {
            throw new ApiError(
              httpStatus.CONFLICT,
              `Insufficient stock for ${item.product.name} (${item.variant.value}).`,
            );
          }
        } else {
          // Decrement base product stock
          const stockUpdate = await tx.product.updateMany({
            where: { id: item.productId, stock: { gte: item.quantity } },
            data: { stock: { decrement: item.quantity } },
          });
          if (stockUpdate.count !== 1) {
            throw new ApiError(
              httpStatus.CONFLICT,
              `Insufficient stock for ${item.product.name}.`,
            );
          }
        }

        const updatedProduct = await tx.product.findUniqueOrThrow({
          where: { id: item.productId },
        });

        if (updatedProduct.stock <= 10) {
          for (const admin of admins) {
            await tx.notification.create({
              data: {
                userId: admin.id,
                title: "Low Stock Alert",
                message: `Product ${updatedProduct.name} is running low on stock (${updatedProduct.stock} left).`,
                type: "SYSTEM",
                data: {
                  productId: updatedProduct.id,
                  stock: updatedProduct.stock,
                },
              },
            });
          }
        }
      }

      // Mark coupon as used
      if (couponId) {
        await tx.coupon.update({
          where: { id: couponId },
          data: { usedCount: { increment: 1 } },
        });
        await tx.couponUsage.create({
          data: { couponId, userId: effectiveUserId },
        });
      }

      // Clear cart
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return newOrder as any;
    },
    {
      maxWait: 10_000,
      timeout: 30_000,
    },
  );

  // Send confirmation email (non-blocking)
  if (userData?.email) {
    emailHelper
      .sendEmail({
        to: userData.email,
        subject: `Order Confirmed #${order.orderNumber}`,
        html: emailHelper.orderConfirmationTemplate(
          order.orderNumber,
          order.total,
          (order as any).items.map((i: any) => ({
            name: i.name,
            quantity: i.quantity,
            price: i.price,
          })),
        ),
      })
      .catch(() => {}); // fire-and-forget
  }

  const purchaseTrackingId = purchaseEventId(order.id);
  if (order.paymentMethod === PaymentMethod.CASH_ON_DELIVERY) {
    queuePurchaseEventByOrderId(order.id).catch((error) => {
      console.error("[Tracking] Failed to queue COD purchase event", error);
    });
  }

  return {
    ...order,
    purchaseEventId: purchaseTrackingId,
    auth,
  };
};

const getMyOrders = async (userId: string, options: IOptions) => {
  const { page, limit, skip } = paginationHelper.calculatePagination(options);
  const [data, total] = await Promise.all([
    prisma.order.findMany({
      where: { userId },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          include: {
            product: {
              include: { images: { where: { isPrimary: true }, take: 1 } },
            },
            variant: true,
          },
        },
        payment: true,
      },
    }),
    prisma.order.count({ where: { userId } }),
  ]);
  return { data, meta: { page, limit, total } };
};

const getOrderById = async (orderId: string, userId: string) => {
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
    include: {
      items: {
        include: {
          product: {
            include: { images: { where: { isPrimary: true }, take: 1 } },
          },
          variant: true,
        },
      },
      payment: true,
      address: { include: { division: true, district: true, upazila: true } },
      tracking: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!order) throw new ApiError(httpStatus.NOT_FOUND, "Order not found.");
  return order;
};

const cancelOrder = async (orderId: string, userId: string) => {
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
  });
  if (!order) throw new ApiError(httpStatus.NOT_FOUND, "Order not found.");
  if (!["PENDING", "CONFIRMED"].includes(order.status))
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Order cannot be cancelled at this stage.",
    );

  return prisma.$transaction(
    async (tx) => {
      const cancellable = await tx.order.findFirst({
        where: {
          id: orderId,
          userId,
          status: { in: [OrderStatus.PENDING, OrderStatus.CONFIRMED] },
        },
      });
      if (!cancellable) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          "Order cannot be cancelled at this stage.",
        );
      }

      // Restore stock
      const items = await tx.orderItem.findMany({ where: { orderId } });
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
      const updated = await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.CANCELLED },
      });
      await tx.orderTracking.create({
        data: {
          orderId,
          status: OrderStatus.CANCELLED,
          message: "Order cancelled by customer.",
        },
      });

      await tx.notification.create({
        data: {
          userId,
          title: "Order cancelled",
          message: `Your order #${order.orderNumber} has been cancelled.`,
          type: "ORDER",
          data: {
            orderId,
            orderNumber: order.orderNumber,
            status: OrderStatus.CANCELLED,
          },
        },
      });

      return updated;
    },
    {
      maxWait: 10_000,
      timeout: 30_000,
    },
  );
};

const getAllOrders = async (
  options: IOptions,
  filters: Record<string, string>,
) => {
  const { page, limit, skip } = paginationHelper.calculatePagination(options);
  const where: any = {};
  if (filters.status) where.status = filters.status;
  if (filters.userId) where.userId = filters.userId;

  const [data, total] = await Promise.all([
    prisma.order.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true } },
        items: true,
        payment: true,
      },
    }),
    prisma.order.count({ where }),
  ]);
  return { data, meta: { page, limit, total } };
};

const getAdminOrderById = async (orderId: string) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } },
      items: {
        include: {
          product: {
            include: { images: { where: { isPrimary: true }, take: 1 } },
          },
          variant: true,
        },
      },
      payment: true,
      address: { include: { division: true, district: true, upazila: true } },
      tracking: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!order) throw new ApiError(httpStatus.NOT_FOUND, "Order not found.");
  return order;
};

const updateOrderStatus = async (
  orderId: string,
  newStatus: OrderStatus,
  note?: string,
  notifyCustomer: boolean = true,
  io?: SocketServer,
) => {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new ApiError(httpStatus.NOT_FOUND, "Order not found.");

  if (!orderHelper.isValidTransition(order.status, newStatus)) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Cannot transition from ${order.status} to ${newStatus}.`,
    );
  }

  const updated = await prisma.$transaction(
    async (tx) => {
      const result = await tx.order.update({
        where: { id: orderId },
        data: { status: newStatus },
      });
      await tx.orderTracking.create({
        data: { orderId, status: newStatus, note },
      });

      if (notifyCustomer) {
        // Create in-app notification for the customer
        await tx.notification.create({
          data: {
            userId: order.userId,
            title: `Order ${newStatus.replace(/_/g, " ")}`,
            message:
              note ||
              `Your order #${order.orderNumber} status has been updated to ${newStatus}.`,
            type: "ORDER",
            data: {
              orderId,
              orderNumber: order.orderNumber,
              status: newStatus,
            },
          },
        });
      }

      return result;
    },
    {
      maxWait: 10_000,
      timeout: 30_000,
    },
  );

  if (notifyCustomer) {
    const user = await prisma.user.findUnique({
      where: { id: order.userId },
      select: { email: true, phone: true, name: true },
    });

    if (user && newStatus === OrderStatus.CONFIRMED) {
      const items = await prisma.orderItem.findMany({ where: { orderId } });
      emailHelper
        .sendEmail({
          to: user.email,
          subject: `Order Confirmed - #${order.orderNumber}`,
          html: emailHelper.orderConfirmationTemplate(
            order.orderNumber,
            order.total,
            items as any,
          ),
        })
        .catch(() => {});
      if (user.phone)
        smsHelper
          .sendOrderConfirmationSms(user.phone, order.orderNumber)
          .catch(() => {});
    }

    if (user && newStatus === OrderStatus.OUT_FOR_DELIVERY && user.phone) {
      smsHelper.sendDeliverySms(user.phone, order.orderNumber).catch(() => {});
    }
  }

  // Emit real-time Socket.io event to the order room
  if (io) {
    io.to(`order:${orderId}`).emit("order:status", {
      orderId,
      orderNumber: order.orderNumber,
      status: newStatus,
      message: note || `Order status updated to ${newStatus}`,
      timestamp: new Date().toISOString(),
    });
    if (newStatus === OrderStatus.CONFIRMED) {
      io.to(`order:${orderId}`).emit("order:confirmed", {
        orderId,
        orderNumber: order.orderNumber,
        timestamp: new Date().toISOString(),
      });
    } else if (newStatus === OrderStatus.SHIPPED) {
      io.to(`order:${orderId}`).emit("order:shipped", {
        orderId,
        orderNumber: order.orderNumber,
        timestamp: new Date().toISOString(),
      });
    } else if (newStatus === OrderStatus.DELIVERED) {
      io.to(`order:${orderId}`).emit("order:delivered", {
        orderId,
        orderNumber: order.orderNumber,
        timestamp: new Date().toISOString(),
      });
    }
  }

  return updated;
};

const reorder = async (orderId: string, userId: string) => {
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
    include: { items: true },
  });
  if (!order) throw new ApiError(httpStatus.NOT_FOUND, "Order not found.");

  const cart = await prisma.cart.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });

  await prisma.$transaction(
    order.items.map((item) =>
      prisma.cartItem.upsert({
        where: {
          cartId_productId_variantId: {
            cartId: cart.id,
            productId: item.productId,
            // Restore the original variant — null is valid for non-variant items
            variantId: (item.variantId ?? null) as string,
          },
        },
        create: {
          cartId: cart.id,
          productId: item.productId,
          variantId: item.variantId ?? null,
          quantity: item.quantity,
        },
        update: { quantity: { increment: item.quantity } },
      }),
    ),
  );

  return { message: "Items added to cart." };
};

const generatePackingSlip = async (orderId: string) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: { select: { name: true, phone: true, email: true } },
      address: { include: { division: true, district: true, upazila: true } },
      items: {
        include: {
          product: {
            include: {
              images: { where: { isPrimary: true }, take: 1 },
            },
          },
          variant: true,
        },
      },
      payment: true,
      coupon: true,
    },
  });
  if (!order) throw new ApiError(httpStatus.NOT_FOUND, "Order not found.");

  // Get Logo Data URI
  let logoDataUri = "";
  try {
    const logoPath = path.join(process.cwd(), "src/app/assets/logo.png");
    if (fs.existsSync(logoPath)) {
      const logoBase64 = fs.readFileSync(logoPath).toString("base64");
      logoDataUri = `data:image/png;base64,${logoBase64}`;
    }
  } catch (error) {
    console.error("Failed to load logo for packing slip", error);
  }

  const date = new Date(order.createdAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const time = new Date(order.createdAt).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Packing Slip - #${order.orderNumber}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        
        :root {
          --primary: #10b981;
          --primary-dark: #059669;
          --slate-900: #0f172a;
          --slate-700: #334155;
          --slate-500: #64748b;
          --slate-400: #94a3b8;
          --slate-100: #f1f5f9;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact; }
        body { 
          font-family: 'Inter', -apple-system, sans-serif; 
          color: var(--slate-900); 
          line-height: 1.4;
          background: #f1f5f9;
          padding: 40px;
        }
        
        .page { 
          max-width: 900px; 
          margin: 0 auto; 
          background: #fff; 
          padding: 50px; 
          border-radius: 8px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          position: relative;
        }

        .watermark {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-45deg);
          font-size: 120px;
          font-weight: 900;
          color: rgba(16, 185, 129, 0.05);
          pointer-events: none;
          text-transform: uppercase;
          z-index: 0;
        }

        /* Top Header */
        .header { 
          display: flex; 
          justify-content: space-between; 
          align-items: flex-start; 
          margin-bottom: 40px;
          border-bottom: 2px solid var(--slate-100);
          padding-bottom: 30px;
        }
        
        .brand-box { display: flex; align-items: center; gap: 10px; }
        .logo-img { height: 40px; width: auto; }
        .brand-name { font-size: 32px; font-weight: 800; letter-spacing: -1.5px; }
        .brand-accent { color: var(--primary); }
        .brand-tagline { font-size: 12px; color: var(--slate-500); font-weight: 600; }

        .order-id-box { text-align: right; }
        .slip-title { font-size: 11px; font-weight: 800; letter-spacing: 2px; color: var(--primary); text-transform: uppercase; margin-bottom: 8px; }
        .order-num { font-size: 24px; font-weight: 900; color: var(--slate-900); }
        .order-date { font-size: 13px; color: var(--slate-500); font-weight: 500; }

        /* Address Grid */
        .info-grid { display: grid; grid-template-columns: 1.5fr 1fr; gap: 40px; margin-bottom: 40px; position: relative; z-index: 1; }
        .section-label { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: var(--slate-400); margin-bottom: 12px; border-bottom: 1px solid var(--slate-100); padding-bottom: 6px; }
        
        .address-card .name { font-size: 18px; font-weight: 800; color: var(--slate-900); margin-bottom: 5px; }
        .address-card .detail { font-size: 14px; color: var(--slate-700); font-weight: 500; margin-bottom: 2px; }

        .meta-card .item { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
        .meta-card .item .key { color: var(--slate-500); font-weight: 600; }
        .meta-card .item .val { font-weight: 700; color: var(--slate-900); }

        /* Items Table */
        .table-wrap { margin-bottom: 30px; position: relative; z-index: 1; }
        .item-table { width: 100%; border-collapse: collapse; }
        .item-table th { 
          text-align: left; 
          padding: 12px 15px; 
          background: var(--slate-100); 
          font-size: 11px; 
          font-weight: 800; 
          text-transform: uppercase;
          color: var(--slate-700);
        }
        .item-table td { padding: 15px; border-bottom: 1px solid var(--slate-100); }
        
        .prod-info { display: flex; align-items: center; gap: 15px; }
        .prod-thumb { width: 40px; height: 40px; border-radius: 6px; object-fit: cover; border: 1px solid var(--slate-100); }
        .prod-details .p-name { font-weight: 700; font-size: 14px; color: var(--slate-900); }
        .prod-details .p-meta { font-size: 11px; color: var(--slate-500); font-weight: 600; }
        
        .col-qty { font-weight: 800; color: var(--primary); font-size: 16px; text-align: center; }
        .col-price { font-weight: 600; color: var(--slate-700); font-size: 14px; text-align: right; }

        /* Summary & Signature */
        .bottom-grid { display: grid; grid-template-columns: 1fr 300px; gap: 40px; margin-top: 30px; }
        
        .notes-box { background: #fdfdfd; border: 1px dashed var(--slate-200); padding: 20px; border-radius: 12px; }
        .notes-box h4 { font-size: 11px; font-weight: 800; text-transform: uppercase; color: var(--slate-400); margin-bottom: 10px; }
        .notes-box p { font-size: 13px; color: var(--slate-700); font-weight: 500; }

        .totals-box table { width: 100%; }
        .totals-box td { padding: 6px 0; font-size: 14px; }
        .totals-box .label { color: var(--slate-500); font-weight: 600; }
        .totals-box .val { text-align: right; font-weight: 700; }
        .totals-box .grand { border-top: 2px solid var(--slate-900); padding-top: 15px; margin-top: 10px; font-size: 20px; color: var(--primary); }

        .signature-area { margin-top: 50px; display: flex; justify-content: space-between; border-top: 1px solid var(--slate-100); padding-top: 30px; }
        .sig-box { text-align: center; width: 200px; }
        .sig-line { border-bottom: 1px solid var(--slate-400); height: 40px; margin-bottom: 8px; }
        .sig-label { font-size: 10px; font-weight: 800; text-transform: uppercase; color: var(--slate-400); }

        .footer { margin-top: 50px; text-align: center; }
        .footer p { font-size: 11px; color: var(--slate-400); font-weight: 500; }

        .print-btn {
          position: fixed;
          bottom: 40px;
          right: 40px;
          background: var(--primary);
          color: white;
          border: none;
          padding: 16px 32px;
          border-radius: 50px;
          font-weight: 800;
          font-size: 16px;
          cursor: pointer;
          box-shadow: 0 10px 25px rgba(16, 185, 129, 0.4);
          display: flex;
          align-items: center;
          gap: 12px;
          transition: all 0.3s;
          z-index: 100;
        }
        .print-btn:hover { transform: scale(1.05); background: var(--primary-dark); }

        @media print {
          body { background: white; padding: 0; }
          .page { box-shadow: none; border: none; padding: 0; max-width: 100%; width: 100%; }
          .print-btn { display: none; }
          @page { margin: 1.5cm; }
        }
      </style>
    </head>
    <body>
      <div class="page">
        <div class="watermark">${order.status}</div>
        
        <!-- Header -->
        <div class="header">
          <div class="brand-wrap">
            <div class="brand-box">
              ${logoDataUri ? `<img src="${logoDataUri}" class="logo-img">` : ""}
              <h1 class="brand-name">Krishi<span class="brand-accent"> Bari</span></h1>
            </div>
            <p class="brand-tagline">Bangladesh's freshest online agricultural marketplace</p>
          </div>
          <div class="order-id-box">
            <p class="slip-title">Official Packing Slip</p>
            <h2 class="order-num">#${order.orderNumber}</h2>
            <p class="order-date">${date} at ${time}</p>
          </div>
        </div>

        <!-- Info Grid -->
        <div class="info-grid">
          <div class="address-card">
            <h3 class="section-label">Ship To</h3>
            <p class="name">${order.user.name}</p>
            <p class="detail">${order.address.line1}, ${order.address.line2 || ""}</p>
            <p class="detail">${order.address.upazila.name}, ${order.address.district.name}</p>
            <p class="detail">${order.address.division.name} - ${order.address.postalCode}</p>
            <p class="detail" style="margin-top: 8px;"><strong>Phone:</strong> ${order.address.phone}</p>
          </div>
          <div class="meta-card">
            <h3 class="section-label">Order Details</h3>
            <div class="item"><span class="key">Payment:</span> <span class="val">${order.paymentMethod.replace(/_/g, " ")}</span></div>
            <div class="item"><span class="key">Slot:</span> <span class="val">${order.deliverySlot || "ASAP"}</span></div>
            <div class="item"><span class="key">Status:</span> <span class="val" style="color: var(--primary)">${order.status}</span></div>
            <div class="item"><span class="key">Customer Email:</span> <span class="val">${order.user.email}</span></div>
          </div>
        </div>

        <!-- Items -->
        <div class="table-wrap">
          <h3 class="section-label">Items to Pack</h3>
          <table class="item-table">
            <thead>
              <tr>
                <th width="60%">Product Detail</th>
                <th width="15%" style="text-align: center;">Price</th>
                <th width="10%" style="text-align: center;">Qty</th>
                <th width="15%" style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${order.items
                .map((i) => {
                  // Use snapshot SKU: prefer variant SKU, then fall back to live product SKU
                  const skuDisplay = (i as any).variantSku || (i as any).product?.sku || "N/A";
                  // Use snapshot variant label for packers to identify correct variant
                  const variantMeta = (i as any).variantValue
                    ? `${(i as any).variantName ? (i as any).variantName + ": " : ""}${(i as any).variantValue}`
                    : null;
                  return `
                  <tr>
                    <td>
                      <div class="prod-info">
                        <div class="prod-details">
                          <p class="p-name">${i.name}</p>
                          <p class="p-meta">${variantMeta ? `Variant: ${variantMeta} | ` : ""}SKU: ${skuDisplay}</p>
                        </div>
                      </div>
                    </td>
                    <td style="text-align: center; color: var(--slate-500); font-size: 13px;">৳${i.price.toFixed(2)}</td>
                    <td class="col-qty">${i.quantity}</td>
                    <td class="col-price">৳${(i.price * i.quantity).toFixed(2)}</td>
                  </tr>
                `;
                })
                .join("")}
            </tbody>
          </table>
        </div>

        <!-- Bottom Grid -->
        <div class="bottom-grid">
          <div class="notes-box">
            <h4>Packer Notes</h4>
            <p>${order.notes || "No special instructions provided."}</p>
          </div>
          <div class="totals-box">
            <table>
              <tr><td class="label">Subtotal</td><td class="val">৳${order.subtotal.toFixed(2)}</td></tr>
              <tr><td class="label">Delivery Charge</td><td class="val">৳${order.deliveryFee.toFixed(2)}</td></tr>
              ${order.discount > 0 ? `<tr><td class="label">Discount ${order.coupon ? `(${order.coupon.code})` : ""}</td><td class="val" style="color: #ef4444;">-৳${order.discount.toFixed(2)}</td></tr>` : ""}
              <tr class="grand"><td class="label" style="color: var(--slate-900)">Total Payable</td><td class="val">৳${order.total.toFixed(2)}</td></tr>
            </table>
          </div>
        </div>

        <!-- Signature -->
        <div class="signature-area">
          <div class="sig-box">
            <div class="sig-line"></div>
            <p class="sig-label">Customer Signature</p>
          </div>
          <div class="sig-box">
            <div class="sig-line"></div>
            <p class="sig-label">Packed By (Admin)</p>
          </div>
          <div class="sig-box">
            <div class="sig-line"></div>
            <p class="sig-label">Delivery Executive</p>
          </div>
        </div>

        <div class="footer">
          <p>Thank you for choosing Krishi Bari. For support, call +880 1XXX-XXXXXX</p>
          <p style="margin-top: 5px;">Printed from Admin Portal - Krishi Bari Ltd.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const getInvoice = async (orderId: string, userId?: string) => {
  const order = await prisma.order.findFirst({
    where: { id: orderId, ...(userId ? { userId } : {}) },
    include: {
      user: { select: { name: true, email: true, phone: true } },
      address: { include: { division: true, district: true, upazila: true } },
      items: {
        include: { variant: true },
      },
    },
  });
  if (!order) throw new ApiError(httpStatus.NOT_FOUND, "Order not found.");
  return pdfHelper.generateInvoice(order);
};

export const OrderService = {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  getAllOrders,
  getAdminOrderById,
  updateOrderStatus,
  reorder,
  generatePackingSlip,
  getInvoice,
};
