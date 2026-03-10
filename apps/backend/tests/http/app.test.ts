import crypto from "node:crypto";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockSupabase } from "../utils/mockSupabase";

const supabase = createMockSupabase();
const githubProcessMock = vi.fn();

vi.mock("../../src/services/supabase/client", () => ({
  supabaseAdmin: supabase.supabaseAdmin,
  supabaseAuthClient: supabase.supabaseAuthClient,
}));

vi.mock("../../src/modules/github/github.service", async () => {
  const actual = await vi.importActual<typeof import("../../src/modules/github/github.service")>("../../src/modules/github/github.service");
  return {
    ...actual,
    GithubService: class {
      verifyWebhookSignature = actual.GithubService.prototype.verifyWebhookSignature;
      processWebhookEvent = githubProcessMock;
    },
  };
});

describe("app routes", () => {
  beforeEach(() => {
    supabase.reset();
    githubProcessMock.mockReset();
  });

  it("rejects protected routes without bearer auth", async () => {
    const { app } = await import("../../src/app");
    const response = await request(app).get("/api/dashboard/summary");

    expect(response.status).toBe(401);
    expect(response.body.message).toMatch(/Unauthorized/i);
  });

  it("handles login requests with the auth service path", async () => {
    supabase.supabaseAuthClient.auth.signInWithPassword.mockResolvedValue({
      data: {
        user: { id: "user-1", email: "ada@example.com" },
        session: { access_token: "access", refresh_token: "refresh", expires_at: 123 },
      },
      error: null,
    });
    supabase.queueResult("profiles", "select", {
      data: {
        id: "user-1",
        email: "ada@example.com",
        full_name: "Ada Lovelace",
        avatar_url: null,
        created_at: "2026-03-10T08:00:00.000Z",
        updated_at: "2026-03-10T08:00:00.000Z",
      },
    });

    const { app } = await import("../../src/app");
    const response = await request(app).post("/api/auth/login").send({
      email: "ADA@example.com",
      password: "password123",
    });

    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe("ada@example.com");
    expect(supabase.supabaseAuthClient.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "ada@example.com",
      password: "password123",
    });
  });

  it("accepts valid GitHub webhooks and forwards parsed events", async () => {
    githubProcessMock.mockResolvedValue({ accepted: true, event: "push", action: "push" });
    const rawBody = JSON.stringify({
      repository: { name: "review-platform", full_name: "openai/review-platform" },
    });
    const signature = crypto.createHmac("sha256", "webhook-secret").update(Buffer.from(rawBody)).digest("hex");

    const { app } = await import("../../src/app");
    const response = await request(app)
      .post("/api/github/webhooks")
      .set("content-type", "application/json")
      .set("x-github-event", "push")
      .set("x-github-delivery", "delivery-1")
      .set("x-hub-signature-256", `sha256=${signature}`)
      .send(rawBody);

    expect(response.status).toBe(202);
    expect(githubProcessMock).toHaveBeenCalledWith(
      "push",
      "delivery-1",
      expect.objectContaining({ repository: expect.objectContaining({ full_name: "openai/review-platform" }) }),
    );
  });
});
