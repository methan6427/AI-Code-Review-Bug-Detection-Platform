import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { scanTriggerRateLimiter } from "../../middleware/rateLimit";
import { RepositoryController } from "./repository.controller";
import { ScanController } from "../scans/scan.controller";

const controller = new RepositoryController();
const scanController = new ScanController();
export const repositoryRouter = Router();

repositoryRouter.get("/", asyncHandler(controller.list.bind(controller)));
repositoryRouter.post("/", asyncHandler(controller.create.bind(controller)));
repositoryRouter.post("/import/github", asyncHandler(controller.importGithub.bind(controller)));
repositoryRouter.get("/:id", asyncHandler(controller.detail.bind(controller)));
repositoryRouter.patch("/:id", asyncHandler(controller.update.bind(controller)));
repositoryRouter.delete("/:id", asyncHandler(controller.remove.bind(controller)));
repositoryRouter.post("/:id/scan", scanTriggerRateLimiter, asyncHandler(scanController.createForRepository.bind(scanController)));
