import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { IssueController } from "./issue.controller";

const controller = new IssueController();
export const issueRouter = Router();

issueRouter.get("/scan/:id", asyncHandler(controller.listByScan.bind(controller)));
issueRouter.patch("/bulk", asyncHandler(controller.bulkUpdate.bind(controller)));
issueRouter.get("/:id/activity", asyncHandler(controller.listActivity.bind(controller)));
issueRouter.patch("/:id/status", asyncHandler(controller.updateStatus.bind(controller)));
issueRouter.patch("/:id/triage", asyncHandler(controller.updateTriage.bind(controller)));
