import type { Request, Response } from "express";
import { DashboardService } from "./dashboard.service";
import { logger } from "../../utils/logger";

const dashboardService = new DashboardService();

export class DashboardController {
  async summary(request: Request, response: Response) {
    const startedAt = Date.now();
    logger.info("Dashboard summary request received", {
      userId: request.auth!.user.id,
      origin: request.headers.origin ?? null,
    });

    const summary = await dashboardService.getSummary(request.auth!.user.id, request.auth!.profile);

    logger.info("Dashboard summary response completed", {
      userId: request.auth!.user.id,
      durationMs: Date.now() - startedAt,
      repositoryCount: summary.metrics.repositoryCount,
      scanCount: summary.metrics.scanCount,
    });

    return response.json({ summary });
  }
}
