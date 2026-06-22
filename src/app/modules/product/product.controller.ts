import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import pick from "../../shared/pick";
import { PAGINATION_OPTIONS } from "../../constants";
import { ProductService } from "./product.service";

const PRODUCT_FILTERS = ["search", "categoryId", "isFeatured", "minPrice", "maxPrice"];

const createProduct = catchAsync(async (req: Request, res: Response) => {
  const files = req.files as Express.Multer.File[];
  const result = await ProductService.createProduct(req.body, files);
  sendResponse(res, { statusCode: httpStatus.CREATED, success: true, message: "Product created.", data: result });
});

const getAllProducts = catchAsync(async (req: Request, res: Response) => {
  const options = pick(req.query, PAGINATION_OPTIONS);
  const filters = pick(req.query, PRODUCT_FILTERS);
  const result = await ProductService.getAllProducts(options as any, filters as any, req.user?.userId);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Products fetched.", meta: result.meta, data: result.data });
});

const getProductBySlug = catchAsync(async (req: Request, res: Response) => {
  const result = await ProductService.getProductBySlug(req.params.slug);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Product fetched.", data: result });
});

const getProductById = catchAsync(async (req: Request, res: Response) => {
  const result = await ProductService.getProductById(req.params.id);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Product fetched.", data: result });
});

const updateProduct = catchAsync(async (req: Request, res: Response) => {
  const result = await ProductService.updateProduct(req.params.id, req.body);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Product updated.", data: result });
});

const deleteProduct = catchAsync(async (req: Request, res: Response) => {
  await ProductService.deleteProduct(req.params.id);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Product deleted.", data: null });
});

const addProductImages = catchAsync(async (req: Request, res: Response) => {
  const files = req.files as Express.Multer.File[];
  const result = await ProductService.addProductImages(req.params.id, files);
  sendResponse(res, { statusCode: httpStatus.CREATED, success: true, message: "Images added.", data: result });
});

const deleteProductImage = catchAsync(async (req: Request, res: Response) => {
  await ProductService.deleteProductImage(req.params.imageId);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Image deleted.", data: null });
});

const getFeaturedProducts = catchAsync(async (req: Request, res: Response) => {
  const result = await ProductService.getFeaturedProducts();
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Featured products fetched.", data: result });
});

const autocomplete = catchAsync(async (req: Request, res: Response) => {
  const result = await ProductService.autocomplete(req.query.q as string || "");
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Autocomplete data fetched.", data: result });
});

const bulkImport = catchAsync(async (req: Request, res: Response) => {
  const result = await ProductService.bulkImport(req.body);
  sendResponse(res, { statusCode: httpStatus.CREATED, success: true, message: "Products imported.", data: result });
});

const reorderProductImages = catchAsync(async (req: Request, res: Response) => {
  const result = await ProductService.reorderProductImages(req.body);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Images reordered.", data: result });
});

export const ProductController = { 
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
  reorderProductImages
};
