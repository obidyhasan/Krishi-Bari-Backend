import httpStatus from "http-status";
import { prisma } from "../../shared/prisma";
import ApiError from "../../errors/ApiError";

const normalizeCategory = (category?: string) => {
  const value = category?.trim();
  return value || "General";
};

const createFaq = async (payload: {
  question: string;
  answer: string;
  category?: string;
  sortOrder?: number;
  isPublished?: boolean;
}) => {
  return prisma.faq.create({
    data: {
      question: payload.question.trim(),
      answer: payload.answer.trim(),
      category: normalizeCategory(payload.category),
      sortOrder: payload.sortOrder ?? 0,
      isPublished: payload.isPublished ?? true,
    },
  });
};

const getPublishedFaqs = async () => {
  return prisma.faq.findMany({
    where: { isPublished: true },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
  });
};

const getAllFaqs = async (filters?: {
  search?: string;
  isPublished?: string;
  category?: string;
}) => {
  const where: any = {};

  if (filters?.search) {
    where.OR = [
      { question: { contains: filters.search, mode: "insensitive" } },
      { answer: { contains: filters.search, mode: "insensitive" } },
      { category: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  if (filters?.isPublished === "true") where.isPublished = true;
  if (filters?.isPublished === "false") where.isPublished = false;
  if (filters?.category) where.category = filters.category;

  return prisma.faq.findMany({
    where,
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
  });
};

const getFaqById = async (id: string) => {
  const faq = await prisma.faq.findUnique({ where: { id } });
  if (!faq) throw new ApiError(httpStatus.NOT_FOUND, "FAQ not found.");
  return faq;
};

const updateFaq = async (
  id: string,
  payload: Partial<{
    question: string;
    answer: string;
    category: string;
    sortOrder: number;
    isPublished: boolean;
  }>,
) => {
  await getFaqById(id);

  const data: any = { ...payload };
  if (typeof payload.question === "string")
    data.question = payload.question.trim();
  if (typeof payload.answer === "string") data.answer = payload.answer.trim();
  if (typeof payload.category === "string")
    data.category = normalizeCategory(payload.category);

  return prisma.faq.update({ where: { id }, data });
};

const deleteFaq = async (id: string) => {
  await getFaqById(id);
  return prisma.faq.delete({ where: { id } });
};

const togglePublish = async (id: string) => {
  const faq = await getFaqById(id);
  return prisma.faq.update({
    where: { id },
    data: { isPublished: !faq.isPublished },
  });
};

export const FaqService = {
  createFaq,
  getPublishedFaqs,
  getAllFaqs,
  getFaqById,
  updateFaq,
  deleteFaq,
  togglePublish,
};
