import { describe, expect, it } from "vitest";
import { loginSchema, signupSchema } from "../../src/modules/auth/auth.schema";
import { updateIssueStatusSchema } from "../../src/modules/issues/issue.schema";
import { createRepositorySchema, updateRepositorySchema } from "../../src/modules/repositories/repository.schema";

describe("schema validation", () => {
  it("normalizes auth emails and requires full name on signup", () => {
    expect(signupSchema.parse({ email: "USER@Example.com ", password: "password123", fullName: "Ada" }).email).toBe("user@example.com");
    expect(() => signupSchema.parse({ email: "user@example.com", password: "password123", fullName: " " })).toThrow();
    expect(loginSchema.parse({ email: "USER@Example.com", password: "password123" }).email).toBe("user@example.com");
  });

  it("requires repository update payloads to include at least one field", () => {
    expect(() => updateRepositorySchema.parse({})).toThrow("At least one field is required");
    expect(createRepositorySchema.parse({
      name: "repo",
      owner: "owner",
      branch: "main",
      githubUrl: "https://github.com/owner/repo",
    }).githubUrl).toBe("https://github.com/owner/repo");
  });

  it("restricts issue status transitions to the supported domain values", () => {
    expect(updateIssueStatusSchema.parse({ status: "resolved" }).status).toBe("resolved");
    expect(() => updateIssueStatusSchema.parse({ status: "closed" })).toThrow();
  });
});
