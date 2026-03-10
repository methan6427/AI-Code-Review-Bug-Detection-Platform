import { describe, expect, it } from "vitest";
import { mapIssue, mapScan } from "../../src/utils/mappers";

describe("mappers", () => {
  it("maps scan context with defaults and filters invalid changed files", () => {
    const scan = mapScan({
      id: "scan-1",
      repository_id: "repo-1",
      triggered_by: "user-1",
      status: "queued",
      scan_context: {
        source: "github_push",
        installationId: "bad",
        changedFiles: ["src/index.ts", null, 42],
      },
      attempt_count: 1,
      max_attempts: 3,
      next_retry_at: null,
      last_error_at: null,
      summary: {},
      error_message: null,
      started_at: null,
      completed_at: null,
      created_at: "2026-03-10T08:00:00.000Z",
      updated_at: "2026-03-10T08:00:00.000Z",
      last_error_details: {},
      github_check_run_id: null,
    });

    expect(scan.context.installationId).toBeNull();
    expect(scan.context.changedFiles).toEqual(["src/index.ts"]);
    expect(scan.context.sourceType).toBeNull();
  });

  it("maps issue rows without mutating nullable fields", () => {
    expect(
      mapIssue({
        id: "issue-1",
        scan_id: "scan-1",
        repository_id: "repo-1",
        severity: "high",
        category: "bug",
        status: "open",
        title: "Broken flow",
        description: "Something is broken",
        recommendation: "Fix it",
        file_path: null,
        line_number: null,
        rule_code: null,
        metadata: {},
        created_at: "2026-03-10T08:00:00.000Z",
      }),
    ).toMatchObject({
      filePath: null,
      lineNumber: null,
      ruleCode: null,
    });
  });
});
