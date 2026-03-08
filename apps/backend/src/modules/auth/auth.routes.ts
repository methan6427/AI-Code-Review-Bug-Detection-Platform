import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { requireAuth } from "../../middleware/requireAuth";
import { AuthController } from "./auth.controller";

const controller = new AuthController();
export const authRouter = Router();

authRouter.post("/signup", asyncHandler(controller.signup.bind(controller)));
authRouter.post("/login", asyncHandler(controller.login.bind(controller)));
authRouter.post("/logout", requireAuth, asyncHandler(controller.logout.bind(controller)));
authRouter.get("/me", requireAuth, asyncHandler(controller.me.bind(controller)));

