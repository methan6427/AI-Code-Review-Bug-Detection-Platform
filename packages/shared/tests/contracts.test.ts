import { describe, expect, it } from "vitest";
import { issueCategories, issueSeverities, issueStatuses, scanStatuses } from "../src/enums";
import { makeGithubPullRequestScan, makeGithubPushScan, makeManualScan } from "../../../tests/factories/domain";

describe("shared contracts", () => {
  it("keeps enum domains stable", () => {
    expect(scanStatuses).toEqual(["queued", "running", "completed", "failed"]);
    expect(issueSeverities).toEqual(["critical", "high", "medium", "low", "info"]);
    expect(issueCategories).toContain("security");
    expect(issueStatuses).toContain("ignored");
  });

  it("preserves scan-context variants used by frontend and backend", () => {
    expect(makeManualScan().context).toMatchObject({ source: "manual", sourceType: null });
    expect(makeGithubPushScan().context).toMatchObject({ source: "github_push", commitSha: "abc123" });
    expect(makeGithubPullRequestScan().context).toMatchObject({ source: "github_pull_request", pullRequestNumber: 42 });
  });
});
