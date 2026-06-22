import { ProductStatus } from "@prisma/client";
import httpStatus from "http-status";
import { promises as fs } from "fs";
import { prisma } from "../../shared/prisma";
import ApiError from "../../errors/ApiError";
import { cloudinaryHelper } from "../../helper/cloudinaryHelper";

const removeTempFile = async (filePath?: string) => {
  if (!filePath) return;
  try {
    await fs.unlink(filePath);
  } catch {
    // Ignore missing temp files.
  }
};

const createCategory = async (
  payload: { name: string; description?: string; parentId?: string; isActive?: boolean },
  imagePath?: string
) => {
  const slug = payload.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const exists = await prisma.category.findUnique({ where: { slug } });
  if (exists) throw new ApiError(httpStatus.CONFLICT, "Category with this name already exists.");

  let image: string | undefined;
  try {
    if (imagePath) {
      const uploaded = await cloudinaryHelper.uploadImage(imagePath, "categories");
      image = uploaded.url;
    }

    return prisma.category.create({
      data: { ...payload, slug, image },
      include: { parent: { select: { id: true, name: true } } },
    });
  } finally {
    await removeTempFile(imagePath);
  }
};

const getAllCategories = async (includeInactive = false) => {
  return prisma.category.findMany({
    where: { parentId: null, ...(includeInactive ? {} : { isActive: true }) },
    include: {
      children: {
        where: includeInactive ? {} : { isActive: true },
        include: { children: true },
      },
    },
    orderBy: { name: "asc" },
  });
};

const getCategoryBySlug = async (slug: string) => {
  const category = await prisma.category.findUnique({
    where: { slug },
    include: {
      children: { where: { isActive: true } },
      products: { where: { status: ProductStatus.ACTIVE }, take: 20 },
    },
  });
  if (!category) throw new ApiError(httpStatus.NOT_FOUND, "Category not found.");
  return category;
};

const updateCategory = async (
  id: string,
  payload: { name?: string; description?: string; parentId?: string | null; isActive?: boolean },
  imagePath?: string
) => {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) throw new ApiError(httpStatus.NOT_FOUND, "Category not found.");

  const data: any = { ...payload };
  if (payload.name) {
    data.slug = payload.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  }
  try {
    if (imagePath) {
      const uploaded = await cloudinaryHelper.uploadImage(imagePath, "categories");
      data.image = uploaded.url;
    }

    return prisma.category.update({ where: { id }, data });
  } finally {
    await removeTempFile(imagePath);
  }
};

const deleteCategory = async (id: string) => {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) throw new ApiError(httpStatus.NOT_FOUND, "Category not found.");
  const hasProducts = await prisma.product.count({ where: { categoryId: id } });
  if (hasProducts) throw new ApiError(httpStatus.BAD_REQUEST, "Cannot delete category with products.");
  return prisma.category.delete({ where: { id } });
};

const reorderCategories = async (payload: { id: string; sortOrder: number }[]) => {
  return prisma.$transaction(
    payload.map((item) =>
      prisma.category.update({
        where: { id: item.id },
        data: { sortOrder: item.sortOrder },
      })
    )
  );
};

export const CategoryService = {
  createCategory,
  getAllCategories,
  getCategoryBySlug,
  updateCategory,
  deleteCategory,
  reorderCategories,
};
