import httpStatus from "http-status";
import { ProductStatus } from "@prisma/client";
import { prisma } from "../../shared/prisma";
import ApiError from "../../errors/ApiError";

const getOrCreateCart = async (userId: string) => {
  let cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          product: {
            include: { images: { where: { isPrimary: true }, take: 1 } },
          },
          variant: true,
        },
      },
    },
  });
  if (!cart) {
    cart = await prisma.cart.create({
      data: { userId },
      include: {
        items: {
          include: {
            product: {
              include: { images: { where: { isPrimary: true }, take: 1 } },
            },
            variant: true,
          },
        },
      },
    });
  }
  return cart;
};

const addItem = async (userId: string, productId: string, quantity: number, variantId?: string) => {
  const product = await prisma.product.findFirst({
    where: { id: productId, status: ProductStatus.ACTIVE },
    include: { variants: true },
  });
  if (!product) throw new ApiError(httpStatus.NOT_FOUND, "Product not found.");

  let stock = product.stock;
  if (variantId) {
    const variant = product.variants.find((v) => v.id === variantId);
    if (!variant) throw new ApiError(httpStatus.NOT_FOUND, "Variant not found.");
    stock = variant.stock;
  }

  if (stock < quantity) throw new ApiError(httpStatus.BAD_REQUEST, `Only ${stock} units available.`);

  const cart = await getOrCreateCart(userId);
  const existingItem = cart.items.find(
    (i) => i.productId === productId && i.variantId === (variantId || null)
  );

  if (!existingItem && cart.items.length >= 50) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Cart item limit reached (maximum 50 unique products)."
    );
  }

  if (existingItem) {
    const newQty = existingItem.quantity + quantity;
    if (stock < newQty) throw new ApiError(httpStatus.BAD_REQUEST, `Only ${stock} units available.`);
    await prisma.cartItem.update({ where: { id: existingItem.id }, data: { quantity: newQty } });
  } else {
    await prisma.cartItem.create({ data: { cartId: cart.id, productId, variantId, quantity } });
  }

  return getOrCreateCart(userId);
};

const updateItem = async (userId: string, itemId: string, quantity: number) => {
  const item = await prisma.cartItem.findFirst({
    where: { id: itemId, cart: { userId } },
    include: { product: true, variant: true },
  });
  if (!item) throw new ApiError(httpStatus.NOT_FOUND, "Cart item not found.");

  if (quantity <= 0) {
    await prisma.cartItem.delete({ where: { id: itemId } });
  } else {
    const stock = item.variant ? item.variant.stock : item.product.stock;
    if (stock < quantity)
      throw new ApiError(httpStatus.BAD_REQUEST, `Only ${stock} units available.`);
    await prisma.cartItem.update({ where: { id: itemId }, data: { quantity } });
  }

  return getOrCreateCart(userId);
};

const removeItem = async (userId: string, itemId: string) => {
  const item = await prisma.cartItem.findFirst({ where: { id: itemId, cart: { userId } } });
  if (!item) throw new ApiError(httpStatus.NOT_FOUND, "Cart item not found.");
  await prisma.cartItem.delete({ where: { id: itemId } });
  return getOrCreateCart(userId);
};

const clearCart = async (userId: string) => {
  const cart = await prisma.cart.findUnique({ where: { userId } });
  if (cart) await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  return { message: "Cart cleared." };
};

const mergeCart = async (userId: string, items: Array<{ productId: string; quantity: number; variantId?: string }>) => {
  const cart = await getOrCreateCart(userId);

  for (const item of items) {
    const existing = cart.items.find(
      (i) => i.productId === item.productId && i.variantId === (item.variantId || null)
    );

    if (existing) {
      const newQty = Math.max(existing.quantity, item.quantity);
      await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: newQty } });
    } else if (cart.items.length < 50) {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: item.productId,
          variantId: item.variantId || null,
          quantity: item.quantity,
        },
      });
    }
  }

  return getOrCreateCart(userId);
};

const syncCart = async (
  userId: string,
  items: Array<{ productId: string; quantity: number; variantId?: string }>
) => {
  const normalized = items
    .map((item) => ({
      productId: item.productId,
      variantId: item.variantId ?? null,
      quantity: Math.max(1, Math.floor(item.quantity)),
    }))
    .slice(0, 50);

  const cartId = await prisma.$transaction(async (tx) => {
    const cart = await tx.cart.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });

    if (normalized.length === 0) {
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      return cart.id;
    }

    for (const item of normalized) {
      const product = await tx.product.findFirst({
        where: { id: item.productId, status: ProductStatus.ACTIVE },
        include: { variants: true },
      });

      if (!product) {
        throw new ApiError(httpStatus.NOT_FOUND, "One or more products are unavailable.");
      }

      let stock = product.stock;
      if (item.variantId) {
        const variant = product.variants.find((v) => v.id === item.variantId);
        if (!variant) {
          throw new ApiError(httpStatus.NOT_FOUND, "One or more selected variants are unavailable.");
        }
        stock = variant.stock;
      }

      if (stock < item.quantity) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          `Only ${stock} units available for ${product.name}.`
        );
      }
    }

    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

    // Deduplicate normalized items to avoid unique constraint violations
    const uniqueItemsMap = new Map<string, typeof normalized[0]>();
    for (const item of normalized) {
      const key = `${item.productId}-${item.variantId ?? "none"}`;
      uniqueItemsMap.set(key, item);
    }
    const finalItems = Array.from(uniqueItemsMap.values());

    if (finalItems.length > 0) {
      await tx.cartItem.createMany({
        data: finalItems.map((item) => ({
          cartId: cart.id,
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
        })),
        skipDuplicates: true,
      });
    }

    return cart.id;
  });

  void cartId;
  return getOrCreateCart(userId);
};

export const CartService = {
  getOrCreateCart,
  addItem,
  updateItem,
  removeItem,
  clearCart,
  mergeCart,
  syncCart,
};
