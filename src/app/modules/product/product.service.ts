import { ProductStatus } from "@prisma/client";
import httpStatus from "http-status";
import { promises as fs } from "fs";
import { prisma } from "../../shared/prisma";
import ApiError from "../../errors/ApiError";
import { paginationHelper, IOptions } from "../../helper/paginationHelper";
import { cloudinaryHelper } from "../../helper/cloudinaryHelper";

const sanitizeRichText = (value?: string) => {
  if (!value) return value;
  return value
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "");
};

const removeTempFiles = async (files: Express.Multer.File[] = []) => {
  await Promise.all(
    files.map(async (file) => {
      if (!file?.path) return;
      try {
        await fs.unlink(file.path);
      } catch {
        // Ignore missing temp files.
      }
    }),
  );
};

const createProduct = async (payload: any, files: Express.Multer.File[]) => {
  payload.description = sanitizeRichText(payload.description);
  const slug = payload.name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  const exists = await prisma.product.findUnique({ where: { slug } });
  if (exists)
    throw new ApiError(
      httpStatus.CONFLICT,
      "Product with this name already exists.",
    );

  const skuExists = await prisma.product.findUnique({
    where: { sku: payload.sku },
  });
  if (skuExists) throw new ApiError(httpStatus.CONFLICT, "SKU already in use.");

  const product = await prisma.product.create({
    data: { ...payload, slug },
  });

  if (files?.length) {
    try {
      const imageData = await Promise.all(
        files.map(async (file, index) => {
          const { url, publicId } = await cloudinaryHelper.uploadImage(
            file.path,
            "products",
          );
          return {
            productId: product.id,
            url,
            publicId,
            isPrimary: index === 0,
          };
        }),
      );
      await prisma.productImage.createMany({ data: imageData });
    } finally {
      await removeTempFiles(files);
    }
  }

  return prisma.product.findUnique({
    where: { id: product.id },
    include: {
      images: true,
      category: { select: { id: true, name: true, slug: true } },
    },
  });
};

const getAllProducts = async (
  options: IOptions,
  filters: Record<string, string>,
  userId?: string,
) => {
  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(options);
  const allowedSortFields = new Set([
    "createdAt",
    "updatedAt",
    "name",
    "price",
    "stock",
  ]);
  const safeSortBy = allowedSortFields.has(sortBy) ? sortBy : "createdAt";

  const where: any = { status: ProductStatus.ACTIVE, deletedAt: null };
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { description: { contains: filters.search, mode: "insensitive" } },
      { sku: { contains: filters.search, mode: "insensitive" } },
      { tags: { has: filters.search } },
    ];

    // Log search history for logged-in users
    if (userId) {
      await prisma.searchHistory.create({
        data: { userId, query: filters.search },
      });

      // Keep only last 10 searches
      const count = await prisma.searchHistory.count({ where: { userId } });
      if (count > 10) {
        const oldest = await prisma.searchHistory.findFirst({
          where: { userId },
          orderBy: { createdAt: "asc" },
        });
        if (oldest)
          await prisma.searchHistory.delete({ where: { id: oldest.id } });
      }
    }
  }
  if (filters.categoryId) where.categoryId = filters.categoryId;
  if (filters.isFeatured === "true") where.isFeatured = true;
  if (filters.minPrice || filters.maxPrice) {
    where.price = {};
    if (filters.minPrice) where.price.gte = Number(filters.minPrice);
    if (filters.maxPrice) where.price.lte = Number(filters.maxPrice);
  }

  const [data, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [safeSortBy]: sortOrder },
      include: {
        images: { where: { isPrimary: true }, take: 1 },
        category: { select: { id: true, name: true, slug: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  return { data, meta: { page, limit, total } };
};

const getProductById = async (id: string) => {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      category: true,
      variants: true,
    },
  });
  if (!product) throw new ApiError(httpStatus.NOT_FOUND, "Product not found.");
  return product;
};

const getProductBySlug = async (slug: string) => {
  const product = await prisma.product.findFirst({
    where: { slug, status: ProductStatus.ACTIVE, deletedAt: null },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      category: true,
      variants: true,
      reviews: {
        where: { isApproved: true },
        include: { user: { select: { id: true, name: true, avatar: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });
  if (!product) throw new ApiError(httpStatus.NOT_FOUND, "Product not found.");
  return product;
};

const updateProduct = async (id: string, payload: Partial<any>) => {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw new ApiError(httpStatus.NOT_FOUND, "Product not found.");

  if (payload.name) {
    payload.slug = payload.name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
  }
  if (typeof payload.description === "string") {
    payload.description = sanitizeRichText(payload.description);
  }

  return prisma.product.update({
    where: { id },
    data: payload,
    include: { images: true, category: true },
  });
};

const deleteProduct = async (id: string) => {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw new ApiError(httpStatus.NOT_FOUND, "Product not found.");
  // Soft delete
  return prisma.product.update({
    where: { id },
    data: {
      status: ProductStatus.DISCONTINUED,
      deletedAt: new Date(),
    },
  });
};

const addProductImages = async (
  productId: string,
  files: Express.Multer.File[],
) => {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { images: true },
  });
  if (!product) throw new ApiError(httpStatus.NOT_FOUND, "Product not found.");
  if (!files?.length) return [];

  try {
    const existingImageCount = product.images.length;
    const imageData = await Promise.all(
      files.map(async (file, index) => {
        const { url, publicId } = await cloudinaryHelper.uploadImage(
          file.path,
          "products",
        );
        return {
          productId,
          url,
          publicId,
          isPrimary: existingImageCount === 0 && index === 0,
          sortOrder: existingImageCount + index,
        };
      }),
    );
    const createdImages = await prisma.productImage.createManyAndReturn({
      data: imageData,
    });
    return createdImages.sort((a, b) => a.sortOrder - b.sortOrder);
  } finally {
    await removeTempFiles(files);
  }
};

const deleteProductImage = async (imageId: string) => {
  const image = await prisma.productImage.findUnique({
    where: { id: imageId },
  });
  if (!image) throw new ApiError(httpStatus.NOT_FOUND, "Image not found.");
  if (image.publicId) await cloudinaryHelper.deleteImage(image.publicId);
  return prisma.productImage.delete({ where: { id: imageId } });
};

const getFeaturedProducts = async () => {
  return prisma.product.findMany({
    where: { isFeatured: true, status: ProductStatus.ACTIVE, deletedAt: null },
    include: { images: { where: { isPrimary: true }, take: 1 } },
    take: 12,
  });
};

const autocomplete = async (query: string) => {
  if (!query) return { products: [], categories: [] };
  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: {
        name: { contains: query, mode: "insensitive" },
        status: ProductStatus.ACTIVE,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        salePrice: true,
        images: { where: { isPrimary: true }, take: 1 },
      },
      take: 5,
    }),
    prisma.category.findMany({
      where: { name: { contains: query, mode: "insensitive" }, isActive: true },
      select: { id: true, name: true, slug: true },
      take: 3,
    }),
  ]);
  return { products, categories };
};

const bulkImport = async (data: any[]) => {
  return prisma.$transaction(
    data.map((item) =>
      prisma.product.upsert({
        where: { sku: item.sku },
        update: item,
        create: {
          ...item,
          slug: item.name
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-]/g, ""),
        },
      }),
    ),
  );
};

const reorderProductImages = async (
  payload: { id: string; sortOrder: number }[],
) => {
  return prisma.$transaction(
    payload.map((item) =>
      prisma.productImage.update({
        where: { id: item.id },
        data: { sortOrder: item.sortOrder },
      }),
    ),
  );
};

export const ProductService = {
  createProduct,
  getAllProducts,
  getProductById,
  getProductBySlug,
  updateProduct,
  deleteProduct,
  addProductImages,
  deleteProductImage,
  getFeaturedProducts,
  autocomplete,
  bulkImport,
  reorderProductImages,
};
