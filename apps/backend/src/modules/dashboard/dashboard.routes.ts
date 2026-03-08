import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { DashboardController } from "./dashboard.controller";

const controller = new DashboardController();
export const dashboardRouter = Router();

dashboardRouter.get("/summary", asyncHandler(controller.summary.bind(controller)));

