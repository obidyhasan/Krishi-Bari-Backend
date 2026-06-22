import httpStatus from "http-status";
import { NextFunction, Request, Response } from "express";

const notFound = (req: Request, res: Response, next: NextFunction) => {
  res.status(httpStatus.NOT_FOUND).json({
    success: false,
    statusCode: httpStatus.NOT_FOUND,
    message: "API NOT FOUND!",
    errors: ["Your requested path is not found!"],
    requestId: res.locals.requestId,
  });
};

export default notFound;
