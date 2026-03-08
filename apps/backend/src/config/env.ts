import "dotenv/config";
import { z } from "zod";

const normalizeOrigins = (value: string) =>
  value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  APP_ORIGIN: z
    .string()
    .min(1)
    .transform(normalizeOrigins)
    .refine((value) => value.length > 0 && value.every((origin) => z.string().url().safeParse(origin).success), {
      message: "APP_ORIGIN must contain one or more valid origins",
    }),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

const envResult = envSchema.safeParse(process.env);

if (!envResult.success) {
  const formatted = envResult.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
  throw new Error(`Invalid environment configuration. ${formatted}`);
}

export const env = envResult.data;
