import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { env } from "../config/env";
import { logger } from "../utils/logger";

const isProd = env.NODE_ENV === "production";

export const errorHandler = (
  error: unknown,
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

  const err = error instanceof Error ? error : new Error(String(error));
  const status = (err as Error & { status?: number }).status ?? 500;

  if (status >= 500) {
    logger.error("Unhandled request error", {
      method: request.method,
      path: request.path,
      message: err.message,
      stack: err.stack,
    });

    return response.status(status).json({
      message: isProd ? "Internal server error" : err.message || "Internal server error",
    });
  }

  return response.status(status).json({
    message: err.message || "Request failed",
  });
};
