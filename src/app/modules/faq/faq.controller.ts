import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { FaqService } from "./faq.service";

const createFaq = catchAsync(async (req: Request, res: Response) => {
  const result = await FaqService.createFaq(req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "FAQ created.",
    data: result,
  });
});

const getPublishedFaqs = catchAsync(async (_req: Request, res: Response) => {
  const result = await FaqService.getPublishedFaqs();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Published FAQs fetched.",
    data: result,
  });
});

const getAllFaqs = catchAsync(async (req: Request, res: Response) => {
  const result = await FaqService.getAllFaqs(
    req.query as { search?: string; isPublished?: string; category?: string },
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "FAQs fetched.",
    data: result,
  });
});

const getFaqById = catchAsync(async (req: Request, res: Response) => {
  const result = await FaqService.getFaqById(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "FAQ fetched.",
    data: result,
  });
});

const updateFaq = catchAsync(async (req: Request, res: Response) => {
  const result = await FaqService.updateFaq(req.params.id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "FAQ updated.",
    data: result,
  });
});

const deleteFaq = catchAsync(async (req: Request, res: Response) => {
  await FaqService.deleteFaq(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "FAQ deleted.",
    data: null,
  });
});

const togglePublish = catchAsync(async (req: Request, res: Response) => {
  const result = await FaqService.togglePublish(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.isPublished ? "FAQ published." : "FAQ unpublished.",
    data: result,
  });
});

export const FaqController = {
  createFaq,
  getPublishedFaqs,
  getAllFaqs,
  getFaqById,
  updateFaq,
  deleteFaq,
  togglePublish,
};
