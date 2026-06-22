import { Prisma } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import config from "../config";

const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode: number = err.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
  let message: string = err.message || "Something went wrong!";
  let errors: string[] = [message];

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case "P1000":
        message = "Authentication failed against the database server.";
        statusCode = httpStatus.BAD_GATEWAY;
        break;
      case "P1001":
        message = "Cannot reach the database server. Please check connection.";
        statusCode = httpStatus.BAD_GATEWAY;
        break;
      case "P1002":
        message = "The database operation timed out.";
        statusCode = httpStatus.REQUEST_TIMEOUT;
        break;
      case "P2000":
        message = "Value too long for a database column.";
        statusCode = httpStatus.BAD_REQUEST;
        break;
      case "P2001":
        message = "Record not found.";
        statusCode = httpStatus.NOT_FOUND;
        break;
      case "P2002":
        message = "Duplicate key error — unique constraint failed.";
        statusCode = httpStatus.CONFLICT;
        break;
      case "P2003":
        message = "Foreign key constraint failed.";
        statusCode = httpStatus.BAD_REQUEST;
        break;
      case "P2004":
        message = "Database constraint failed.";
        statusCode = httpStatus.BAD_REQUEST;
        break;
      case "P2011":
        message = "Null constraint violation — missing required field.";
        statusCode = httpStatus.BAD_REQUEST;
        break;
      case "P2025":
        message = "Record to update/delete does not exist.";
        statusCode = httpStatus.NOT_FOUND;
        break;
      case "P2028":
        message = "Database transaction timed out. Please try again.";
        statusCode = httpStatus.SERVICE_UNAVAILABLE;
        break;
      default:
        message = `Unexpected Prisma error (code: ${err.code}).`;
        statusCode = httpStatus.INTERNAL_SERVER_ERROR;
        break;
    }
    errors = [message];
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    message = "Validation error in Prisma operation.";
    errors = [message];
    statusCode = httpStatus.BAD_REQUEST;
  } else if (err instanceof Prisma.PrismaClientUnknownRequestError) {
    message = "Unknown Prisma request error occurred.";
    errors = [message];
    statusCode = httpStatus.INTERNAL_SERVER_ERROR;
  } else if (err instanceof Prisma.PrismaClientInitializationError) {
    message = "Failed to initialize Prisma client — check your DB connection.";
    errors = [message];
    statusCode = httpStatus.BAD_GATEWAY;
  } else if (err instanceof Error) {
    message = err.message || "An unexpected error occurred.";
    errors = [message];
  }

  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    errors,
    requestId: res.locals.requestId,
    stack: config.node_env === "development" ? err.stack : undefined,
  });
};

export default globalErrorHandler;
