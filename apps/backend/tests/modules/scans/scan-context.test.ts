import { describe, expect, it } from "vitest";
import { buildScanContext } from "../../../src/modules/scans/scan-context";

describe("buildScanContext", () => {
  it("creates a manual context by default", () => {
    expect(buildScanContext("main")).toEqual({
      source: "manual",
      branch: "main",
      commitSha: null,
      baseBranch: null,
      baseCommitSha: null,
      installationId: null,
      pullRequestNumber: null,
      changedFiles: [],
      sourceType: null,
    });
  });

  it("deduplicates and sorts changed files", () => {
    expect(buildScanContext("main", { changedFiles: ["b.ts", "a.ts", "a.ts", "", null as never] }).changedFiles).toEqual(["a.ts", "b.ts"]);
  });
});
