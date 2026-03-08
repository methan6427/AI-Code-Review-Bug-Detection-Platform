import createHttpError from "http-errors";

export const badRequest = (message: string) => createHttpError(400, message);
export const unauthorized = (message = "Unauthorized") => createHttpError(401, message);
export const forbidden = (message = "Forbidden") => createHttpError(403, message);
export const notFound = (message = "Resource not found") => createHttpError(404, message);

