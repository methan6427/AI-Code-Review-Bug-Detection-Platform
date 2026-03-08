import type { Profile } from "@ai-review/shared";

declare global {
  namespace Express {
    interface Request {
      auth?: {
        token: string;
        user: {
          id: string;
          email: string;
        };
        profile: Profile;
      };
    }
  }
}

export {};
