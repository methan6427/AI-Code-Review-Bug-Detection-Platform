import { describe, expect, it, vi } from "vitest";

describe("env", () => {
  it("parses comma-separated origins", async () => {
    vi.resetModules();
    process.env.APP_ORIGIN = "http://localhost:3000, https://example.com";
    const { env } = await import("../../src/config/env");
    expect(env.APP_ORIGIN).toEqual(["http://localhost:3000", "https://example.com"]);
  });

  it("throws on invalid origin configuration", async () => {
    vi.resetModules();
    process.env.APP_ORIGIN = "not-a-url";
    await expect(import("../../src/config/env")).rejects.toThrow("APP_ORIGIN must contain one or more valid origins");
  });
});
