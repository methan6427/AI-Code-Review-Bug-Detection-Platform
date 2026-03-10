import type { Repository, Scan, ScanContext } from "@ai-review/shared";

export const hasActiveScan = (scans: Scan[]) => scans.some((scan) => scan.status === "queued" || scan.status === "running");

export const getRepositoryLabel = (repository: Pick<Repository, "owner" | "name">) => `${repository.owner}/${repository.name}`;

export const getScanSourceLabel = (source: ScanContext["source"]) => {
  switch (source) {
    case "github_push":
      return "GitHub Push";
    case "github_pull_request":
      return "Pull Request";
    case "manual":
    default:
      return "Manual";
  }
};

export const getScanSourceTone = (source: ScanContext["source"]) => {
  switch (source) {
    case "github_push":
      return "github_push" as const;
    case "github_pull_request":
      return "github_pull_request" as const;
    case "manual":
    default:
      return "manual" as const;
  }
};

export const getSourceTypeLabel = (sourceType: ScanContext["sourceType"]) => {
  switch (sourceType) {
    case "git_clone":
      return "Git clone";
    case "sample_files":
      return "Sample files";
    default:
      return "N/A";
  }
};

export const getRepositoryConnectionLabel = (repository: Pick<Repository, "githubInstallationId" | "githubRepositoryId">) =>
  repository.githubInstallationId || repository.githubRepositoryId ? "GitHub App connected" : "Manual repository";
