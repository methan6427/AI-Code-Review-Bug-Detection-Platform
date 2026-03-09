import type { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { loginSchema, signupSchema } from "./auth.schema";

const authService = new AuthService();

export class AuthController {
  async signup(request: Request, response: Response) {
    const input = signupSchema.parse(request.body);
    const result = await authService.signup(input);
    return response.status(201).json(result);
  }

  async login(request: Request, response: Response) {
    const input = loginSchema.parse(request.body);
    const result = await authService.login(input);
    return response.json(result);
  }

  async logout(request: Request, response: Response) {
    const userId = request.auth?.user.id;
    if (!userId) {
      return response.status(200).json({ success: true });
    }

    const result = await authService.logout(userId);
    return response.json(result);
  }

  async me(request: Request, response: Response) {
    const userId = request.auth!.user.id;
    const currentUser = await authService.getCurrentProfile(userId);
    return response.json(currentUser);
  }
}
