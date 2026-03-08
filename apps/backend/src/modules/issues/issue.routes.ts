import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { IssueController } from "./issue.controller";

const controller = new IssueController();
export const issueRouter = Router();

issueRouter.get("/scan/:id", asyncHandler(controller.listByScan.bind(controller)));

