import type { Request, Response } from "express";
import { DashboardService } from "./dashboard.service";

const dashboardService = new DashboardService();

export class DashboardController {
  async summary(request: Request, response: Response) {
    const summary = await dashboardService.getSummary(request.auth!.user.id);
    return response.json({ summary });
  }
}

