import cors from "cors";
import express from "express";
import { env } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";
import { requireAuth } from "./middleware/requireAuth";
import { securityHeaders } from "./middleware/securityHeaders";
import { authRouter } from "./modules/auth/auth.routes";
import { dashboardRouter } from "./modules/dashboard/dashboard.routes";
import { githubRouter } from "./modules/github/github.routes";
import { issueRouter } from "./modules/issues/issue.routes";
import { repositoryRouter } from "./modules/repositories/repository.routes";
import { scanRouter } from "./modules/scans/scan.routes";
import { asyncHandler } from "./utils/asyncHandler";

export const app = express();
app.disable("x-powered-by");

app.use(
  cors({
    origin: env.APP_ORIGIN,
    credentials: true,
  }),
);
app.use(securityHeaders);
app.use("/api/github", githubRouter);
app.use(express.json({ limit: "1mb" }));

app.get(
  "/api/health",
  asyncHandler(async (_request, response) => response.json({ status: "ok", environment: env.NODE_ENV })),
);

app.use("/api/auth", authRouter);
app.use("/api/dashboard", requireAuth, dashboardRouter);
app.use("/api/repositories", requireAuth, repositoryRouter);
app.use("/api/scans", requireAuth, scanRouter);
app.use("/api/issues", requireAuth, issueRouter);
app.use("/api", (_request, response) => {
  response.status(404).json({ message: "API route not found" });
});

app.use(errorHandler);
