import httpStatus from "http-status";
import { ProductStatus } from "@prisma/client";
import { prisma } from "../../shared/prisma";
import ApiError from "../../errors/ApiError";

const getWishlist = async (userId: string) => {
  return prisma.wishlist.findMany({
    where: { userId },
    include: {
      product: {
        include: { images: { where: { isPrimary: true }, take: 1 } },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

const toggleWishlist = async (userId: string, productId: string) => {
  const product = await prisma.product.findFirst({
    where: { id: productId, status: ProductStatus.ACTIVE },
  });
  if (!product) throw new ApiError(httpStatus.NOT_FOUND, "Product not found.");

  const existing = await prisma.wishlist.findUnique({
    where: { userId_productId: { userId, productId } },
  });

  if (existing) {
    await prisma.wishlist.delete({ where: { userId_productId: { userId, productId } } });
    return { added: false, message: "Removed from wishlist." };
  } else {
    await prisma.wishlist.create({ data: { userId, productId } });
    return { added: true, message: "Added to wishlist." };
  }
};

const removeFromWishlist = async (userId: string, productId: string) => {
  const item = await prisma.wishlist.findUnique({
    where: { userId_productId: { userId, productId } },
  });
  if (!item) throw new ApiError(httpStatus.NOT_FOUND, "Item not in wishlist.");
  return prisma.wishlist.delete({ where: { userId_productId: { userId, productId } } });
};

const moveToCart = async (userId: string, productId: string) => {
  return prisma.$transaction(async (tx) => {
    // Check if in wishlist
    const wishlistItem = await tx.wishlist.findUnique({ where: { userId_productId: { userId, productId } } });
    if (!wishlistItem) throw new ApiError(httpStatus.NOT_FOUND, "Item not in wishlist.");

    // Check product
    const product = await tx.product.findUnique({ where: { id: productId } });
    if (!product || product.status !== ProductStatus.ACTIVE || product.stock <= 0) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Product is currently unavailable.");
    }

    // Upsert cart
    const cart = await tx.cart.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });

    // Add to cart
    await tx.cartItem.upsert({
      where: { cartId_productId_variantId: { cartId: cart.id, productId, variantId: null as any } },
      create: { cartId: cart.id, productId, quantity: 1 },
      update: { quantity: { increment: 1 } },
    });

    // Remove from wishlist
    await tx.wishlist.delete({ where: { userId_productId: { userId, productId } } });

    return { message: "Item moved to cart." };
  });
};

const toggleNotifyMe = async (userId: string, productId: string) => {
  const item = await prisma.wishlist.findUnique({ where: { userId_productId: { userId, productId } } });
  if (!item) throw new ApiError(httpStatus.NOT_FOUND, "Item not in wishlist.");

  return prisma.wishlist.update({
    where: { userId_productId: { userId, productId } },
    data: { notifyStock: !item.notifyStock },
  });
};

export const WishlistService = { getWishlist, toggleWishlist, removeFromWishlist, moveToCart, toggleNotifyMe };
