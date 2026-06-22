import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { AddressService } from "./address.service";

const getAddresses = catchAsync(async (req: Request, res: Response) => {
  const result = await AddressService.getAddresses(req.user!.userId);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Addresses fetched.", data: result });
});

const createAddress = catchAsync(async (req: Request, res: Response) => {
  const result = await AddressService.createAddress(req.user!.userId, req.body);
  sendResponse(res, { statusCode: httpStatus.CREATED, success: true, message: "Address added.", data: result });
});

const updateAddress = catchAsync(async (req: Request, res: Response) => {
  const result = await AddressService.updateAddress(req.params.id, req.user!.userId, req.body);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Address updated.", data: result });
});

const deleteAddress = catchAsync(async (req: Request, res: Response) => {
  await AddressService.deleteAddress(req.params.id, req.user!.userId);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Address deleted.", data: null });
});

const setDefaultAddress = catchAsync(async (req: Request, res: Response) => {
  const result = await AddressService.setDefaultAddress(req.params.id, req.user!.userId);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Default address updated.", data: result });
});

export const AddressController = { getAddresses, createAddress, updateAddress, deleteAddress, setDefaultAddress };
