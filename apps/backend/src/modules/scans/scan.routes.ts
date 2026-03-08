import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { ScanController } from "./scan.controller";

const controller = new ScanController();
export const scanRouter = Router();

scanRouter.get("/", asyncHandler(controller.list.bind(controller)));
scanRouter.get("/:id", asyncHandler(controller.detail.bind(controller)));

