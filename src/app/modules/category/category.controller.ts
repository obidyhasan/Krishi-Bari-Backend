import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { CategoryService } from "./category.service";

const createCategory = catchAsync(async (req: Request, res: Response) => {
  const result = await CategoryService.createCategory(req.body, req.file?.path);
  sendResponse(res, { statusCode: httpStatus.CREATED, success: true, message: "Category created.", data: result });
});

const getAllCategories = catchAsync(async (req: Request, res: Response) => {
  const includeInactive = req.query.includeInactive === "true";
  const result = await CategoryService.getAllCategories(includeInactive);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Categories fetched.", data: result });
});

const getCategoryBySlug = catchAsync(async (req: Request, res: Response) => {
  const result = await CategoryService.getCategoryBySlug(req.params.slug);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Category fetched.", data: result });
});

const updateCategory = catchAsync(async (req: Request, res: Response) => {
  const result = await CategoryService.updateCategory(req.params.id, req.body, req.file?.path);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Category updated.", data: result });
});

const deleteCategory = catchAsync(async (req: Request, res: Response) => {
  await CategoryService.deleteCategory(req.params.id);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Category deleted.", data: null });
});

const reorderCategories = catchAsync(async (req: Request, res: Response) => {
  const result = await CategoryService.reorderCategories(req.body);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Categories reordered.", data: result });
});

export const CategoryController = { createCategory, getAllCategories, getCategoryBySlug, updateCategory, deleteCategory, reorderCategories };
