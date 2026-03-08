import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { logger } from "../utils/logger";

export const errorHandler = (
  error: Error & { status?: number },
  request: Request,
  response: Response,
  _next: NextFunction,
) => {
  if (error instanceof ZodError) {
    return response.status(400).json({
      message: "Validation failed",
      issues: error.flatten(),
    });
  }

  const status = error.status ?? 500;
  if (status >= 500) {
    logger.error("Unhandled request error", {
      method: request.method,
      path: request.path,
      message: error.message,
    });
  }

  return response.status(status).json({
    message: error.message || "Internal server error",
  });
};
