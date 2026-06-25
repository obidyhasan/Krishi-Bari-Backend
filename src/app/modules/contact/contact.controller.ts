import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { ContactService } from "./contact.service";

const submitContact = catchAsync(async (req: Request, res: Response) => {
  const result = await ContactService.submitContact(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Message sent successfully.",
    data: result,
  });
});

export const ContactController = { submitContact };
