import type { ScanContext } from "@ai-review/shared";

export type CreateScanContextInput = Partial<Omit<ScanContext, "sourceType">> & {
  source?: ScanContext["source"];
};

const normalizeChangedFiles = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.filter((item): item is string => typeof item === "string" && item.trim().length > 0))].sort();
};

export const buildScanContext = (repositoryBranch: string, input: CreateScanContextInput = {}): ScanContext => ({
  source: input.source ?? "manual",
  branch: input.branch ?? repositoryBranch,
  commitSha: input.commitSha ?? null,
  baseBranch: input.baseBranch ?? null,
  baseCommitSha: input.baseCommitSha ?? null,
  installationId: typeof input.installationId === "number" ? input.installationId : null,
  pullRequestNumber: typeof input.pullRequestNumber === "number" ? input.pullRequestNumber : null,
  changedFiles: normalizeChangedFiles(input.changedFiles),
  sourceType: null,
});
