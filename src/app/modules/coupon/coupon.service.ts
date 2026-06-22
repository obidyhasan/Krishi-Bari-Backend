import httpStatus from "http-status";
import { prisma } from "../../shared/prisma";
import ApiError from "../../errors/ApiError";

const createCoupon = async (payload: any) => {
  const exists = await prisma.coupon.findUnique({ where: { code: payload.code } });
  if (exists) throw new ApiError(httpStatus.CONFLICT, "Coupon code already exists.");
  return prisma.coupon.create({ data: payload });
};

const getAllCoupons = async () => {
  return prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
};

const getCouponById = async (id: string) => {
  const coupon = await prisma.coupon.findUnique({ where: { id } });
  if (!coupon) throw new ApiError(httpStatus.NOT_FOUND, "Coupon not found.");
  return coupon;
};

const updateCoupon = async (id: string, payload: any) => {
  const coupon = await prisma.coupon.findUnique({ where: { id } });
  if (!coupon) throw new ApiError(httpStatus.NOT_FOUND, "Coupon not found.");
  return prisma.coupon.update({ where: { id }, data: payload });
};

const deleteCoupon = async (id: string) => {
  const coupon = await prisma.coupon.findUnique({ where: { id } });
  if (!coupon) throw new ApiError(httpStatus.NOT_FOUND, "Coupon not found.");
  return prisma.coupon.delete({ where: { id } });
};

const validateCoupon = async (code: string, orderAmount: number, userId: string) => {
  const normalizedCode = code.trim().toUpperCase();
  const coupon = await prisma.coupon.findFirst({ where: { code: normalizedCode, isActive: true } });
  if (!coupon) throw new ApiError(httpStatus.BAD_REQUEST, "Invalid or expired coupon code.");
  if (coupon.expiresAt && coupon.expiresAt < new Date())
    throw new ApiError(httpStatus.BAD_REQUEST, "This coupon has expired.");
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit)
    throw new ApiError(httpStatus.BAD_REQUEST, "This coupon has reached its usage limit.");
  if (orderAmount < coupon.minOrder)
    throw new ApiError(httpStatus.BAD_REQUEST, `Minimum order amount is ৳${coupon.minOrder}.`);

  // SRD: treat misconfigured coupon values as invalid (avoid negative totals).
  if (coupon.type === "PERCENT" && coupon.value > 100) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Coupon is misconfigured.");
  }

  const alreadyUsed = await prisma.couponUsage.findUnique({
    where: { couponId_userId: { couponId: coupon.id, userId } },
  });
  if (alreadyUsed) throw new ApiError(httpStatus.BAD_REQUEST, "You have already used this coupon.");

  let discount = coupon.type === "PERCENT"
    ? (orderAmount * coupon.value) / 100
    : coupon.value;
  if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
  discount = Math.max(0, Math.min(discount, orderAmount));

  return {
    coupon: { id: coupon.id, code: coupon.code, discountType: coupon.type, discountValue: coupon.value },
    discount: parseFloat(discount.toFixed(2)),
    finalAmount: parseFloat((orderAmount - discount).toFixed(2)),
  };
};

export const CouponService = { createCoupon, getAllCoupons, getCouponById, updateCoupon, deleteCoupon, validateCoupon };
