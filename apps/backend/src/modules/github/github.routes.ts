import express, { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth";
import { webhookRateLimiter } from "../../middleware/rateLimit";
import { asyncHandler } from "../../utils/asyncHandler";
import { GithubController } from "./github.controller";

const controller = new GithubController();

export const githubRouter = Router();

githubRouter.get("/app/install-url", requireAuth, asyncHandler(controller.installUrl.bind(controller)));
githubRouter.get("/installations", requireAuth, asyncHandler(controller.installations.bind(controller)));
githubRouter.get("/installations/:installationId/repositories", requireAuth, asyncHandler(controller.installationRepositories.bind(controller)));
githubRouter.post(
  "/webhooks",
  webhookRateLimiter,
  express.raw({ type: "application/json", limit: "1mb" }),
  asyncHandler(controller.webhook.bind(controller)),
);
