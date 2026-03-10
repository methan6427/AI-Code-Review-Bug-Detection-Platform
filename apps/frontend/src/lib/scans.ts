import type { Repository, Scan, ScanContext } from "@ai-review/shared";

export const hasActiveScan = (scans: Scan[]) => scans.some((scan) => scan.status === "queued" || scan.status === "running");

export const getRepositoryLabel = (repository: Pick<Repository, "owner" | "name">) => `${repository.owner}/${repository.name}`;

export type ScanDisplayStatus = "queued" | "running" | "retrying" | "completed" | "failed";

export const getScanDisplayStatus = (scan: Pick<Scan, "status" | "attemptCount" | "nextRetryAt" | "errorMessage" | "lastErrorAt">): ScanDisplayStatus => {
  if (scan.status === "failed") {
    return "failed";
  }

  if (scan.status === "completed") {
    return "completed";
  }

  const hasRetrySignal = scan.attemptCount > 1 || Boolean(scan.nextRetryAt || scan.errorMessage || scan.lastErrorAt);
  if (scan.status === "queued" && hasRetrySignal) {
    return "retrying";
  }

  return scan.status;
};

export const getScanDisplayStatusMeta = (scan: Pick<Scan, "status" | "attemptCount" | "nextRetryAt" | "errorMessage" | "lastErrorAt" | "maxAttempts">) => {
  const displayStatus = getScanDisplayStatus(scan);

  switch (displayStatus) {
    case "completed":
      return {
        displayStatus,
        badgeTone: "completed" as const,
        label: "Completed",
        detail: "Report ready",
      };
    case "failed":
      return {
        displayStatus,
        badgeTone: "failed" as const,
        label: "Failed",
        detail: scan.attemptCount >= scan.maxAttempts ? "Retry limit reached" : "Needs follow-up",
      };
    case "running":
      return {
        displayStatus,
        badgeTone: "running" as const,
        label: "Running",
        detail: "Analysis in progress",
      };
    case "retrying":
      return {
        displayStatus,
        badgeTone: "running" as const,
        label: "Retrying",
        detail: scan.nextRetryAt ? "Waiting for next attempt" : "Retry in progress",
      };
    case "queued":
    default:
      return {
        displayStatus: "queued" as const,
        badgeTone: "queued" as const,
        label: "Queued",
        detail: "Waiting for worker",
      };
  }
};

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

export const getScanSourceDescription = (scan: Pick<Scan, "context">) => {
  switch (scan.context.source) {
    case "github_push":
      return scan.context.commitSha ? "Triggered by a repository push event" : "Triggered by GitHub push automation";
    case "github_pull_request":
      return scan.context.pullRequestNumber ? `Triggered by pull request #${scan.context.pullRequestNumber}` : "Triggered by pull request automation";
    case "manual":
    default:
      return "Triggered intentionally from the app";
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

export const getScanFilesLabel = (scan: Pick<Scan, "context">) => {
  const count = scan.context.changedFiles.length;
  if (count === 0) {
    return "No file count";
  }

  return `${count} file${count === 1 ? "" : "s"}`;
};

export const getScanDuration = (scan: Pick<Scan, "startedAt" | "completedAt" | "status">) => {
  if (!scan.startedAt) {
    return null;
  }

  const start = new Date(scan.startedAt).getTime();
  const end = scan.completedAt ? new Date(scan.completedAt).getTime() : scan.status === "running" ? Date.now() : null;

  if (!end || Number.isNaN(start) || Number.isNaN(end) || end < start) {
    return null;
  }

  const totalSeconds = Math.round((end - start) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
};

export const getRepositorySourceLabel = (repository: Pick<Repository, "githubInstallationId" | "githubRepositoryId" | "githubUrl">) => {
  if (repository.githubInstallationId || repository.githubRepositoryId) {
    return "GitHub App";
  }

  if (repository.githubUrl) {
    return "GitHub import";
  }

  return "Manual";
};

export const getRepositoryReadinessLabel = (
  repository: Pick<Repository, "sampleFiles" | "githubInstallationId" | "githubRepositoryId" | "githubUrl">,
) => {
  if (repository.sampleFiles.length > 0 || repository.githubInstallationId || repository.githubRepositoryId || repository.githubUrl) {
    return "Ready to scan";
  }

  return "Needs scan context";
};

export const getRepositoryHealthState = (repository: Pick<Repository, "lastScanAt" | "sampleFiles" | "githubInstallationId" | "githubRepositoryId">) => {
  if (repository.lastScanAt) {
    return {
      tone: "completed" as const,
      label: "Scanned",
      description: "Recent scan activity is available.",
    };
  }

  if (repository.githubInstallationId || repository.githubRepositoryId || repository.sampleFiles.length > 0) {
    return {
      tone: "running" as const,
      label: "Ready",
      description: "The repository has enough context for a manual scan.",
    };
  }

  return {
    tone: "manual" as const,
    label: "Needs setup",
    description: "Add GitHub context or sample files before scanning.",
  };
};
