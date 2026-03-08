import { env } from "../config/env";

type LogLevel = "info" | "warn" | "error";

const writeLog = (level: LogLevel, message: string, meta?: unknown) => {
  const timestamp = new Date().toISOString();
  const payload = meta ? ` ${JSON.stringify(meta)}` : "";
  const line = `[${timestamp}] ${level.toUpperCase()} ${message}${payload}`;

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  if (env.NODE_ENV !== "test") {
    console.info(line);
  }
};

export const logger = {
  info: (message: string, meta?: unknown) => writeLog("info", message, meta),
  warn: (message: string, meta?: unknown) => writeLog("warn", message, meta),
  error: (message: string, meta?: unknown) => writeLog("error", message, meta),
};
