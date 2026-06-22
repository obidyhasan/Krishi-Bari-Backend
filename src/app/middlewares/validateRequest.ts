import { NextFunction, Request, Response } from "express";
import { AnyZodObject, ZodError } from "zod";
import httpStatus from "http-status";
import ApiError from "../errors/ApiError";

const validateRequest = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      if (parsed.body !== undefined) {
        req.body = parsed.body;
      }
      if (parsed.query !== undefined) {
        req.query = parsed.query;
      }
      if (parsed.params !== undefined) {
        req.params = parsed.params;
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const message = error.errors
          .map((e) => `${e.path.slice(1).join(".")}: ${e.message}`)
          .join(", ");
        next(new ApiError(httpStatus.BAD_REQUEST, message));
      } else {
        next(error);
      }
    }
  };
};

export default validateRequest;
