import httpStatus from "http-status";
import { OrderStatus } from "@prisma/client";
import { prisma } from "../../shared/prisma";
import ApiError from "../../errors/ApiError";
import { paginationHelper, IOptions } from "../../helper/paginationHelper";

const REVIEW_EDIT_WINDOW_MS = 48 * 60 * 60 * 1000;

const createReview = async (userId: string, payload: { productId: string; orderId?: string; rating: number; comment?: string }) => {
  const product = await prisma.product.findUnique({ where: { id: payload.productId } });
  if (!product) throw new ApiError(httpStatus.NOT_FOUND, "Product not found.");

  // SRD: Review only allowed after confirmed delivery of the product.
  const deliveredOrderItem = await prisma.orderItem.findFirst({
    where: {
      productId: payload.productId,
      order: {
        userId,
        status: OrderStatus.DELIVERED,
      },
    },
    select: { id: true, orderId: true },
  });
  if (!deliveredOrderItem) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "You can review this product only after it has been delivered."
    );
  }

  // SRD: One review per customer per product.
  const existing = await prisma.review.findFirst({
    where: { userId, productId: payload.productId },
  });
  if (existing) throw new ApiError(httpStatus.CONFLICT, "You have already reviewed this product.");

  return prisma.review.create({
    data: { ...payload, userId, orderId: deliveredOrderItem.orderId },
    include: { user: { select: { id: true, name: true, avatar: true } } },
  });
};

const getProductReviews = async (productId: string, options: IOptions) => {
  const { page, limit, skip } = paginationHelper.calculatePagination(options);
  const [data, total] = await Promise.all([
    prisma.review.findMany({
      where: { productId, isApproved: true },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, name: true, avatar: true } } },
    }),
    prisma.review.count({ where: { productId, isApproved: true } }),
  ]);
  return { data, meta: { page, limit, total } };
};

const updateReview = async (reviewId: string, userId: string, payload: { rating?: number; comment?: string }) => {
  const review = await prisma.review.findFirst({ where: { id: reviewId, userId } });
  if (!review) throw new ApiError(httpStatus.NOT_FOUND, "Review not found.");
  // SRD: Review editable within 48 hours.
  const ageMs = Date.now() - new Date(review.createdAt).getTime();
  if (ageMs > REVIEW_EDIT_WINDOW_MS) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Review can only be edited within 48 hours."
    );
  }
  return prisma.review.update({ where: { id: reviewId }, data: payload });
};

const deleteReview = async (reviewId: string, userId: string, isAdmin = false) => {
  const where = isAdmin ? { id: reviewId } : { id: reviewId, userId };
  const review = await prisma.review.findFirst({ where });
  if (!review) throw new ApiError(httpStatus.NOT_FOUND, "Review not found.");
  return prisma.review.delete({ where: { id: reviewId } });
};

const approveReview = async (reviewId: string, isApproved: boolean) => {
  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review) throw new ApiError(httpStatus.NOT_FOUND, "Review not found.");
  return prisma.review.update({ where: { id: reviewId }, data: { isApproved } });
};

export const ReviewService = { createReview, getProductReviews, updateReview, deleteReview, approveReview };
