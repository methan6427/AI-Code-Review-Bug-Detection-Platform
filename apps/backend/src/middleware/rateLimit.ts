import { rateLimit } from "express-rate-limit";
import type { Request } from "express";
import { env } from "../config/env";

const skipInTest = () => env.NODE_ENV === "test";

const safeIp = (request: Request) => request.ip ?? request.socket.remoteAddress ?? "unknown";

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: skipInTest,
  keyGenerator: (request: Request) => {
    const email = typeof request.body?.email === "string" ? request.body.email.toLowerCase() : "";
    const ip = safeIp(request);
    return email ? `${ip}:${email}` : ip;
  },
  message: { message: "Too many auth attempts. Try again in a few minutes." },
});

export const scanTriggerRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: skipInTest,
  keyGenerator: (request: Request) => request.auth?.user?.id ?? safeIp(request),
  message: { message: "Scan trigger rate limit exceeded. Slow down." },
});

export const webhookRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: skipInTest,
  keyGenerator: safeIp,
  message: { message: "Webhook rate limit exceeded." },
});
