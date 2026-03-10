import type { Issue, Repository, Scan } from "@ai-review/shared";
import { GithubIntegrationService } from "../../services/github/GithubIntegrationService";
import { logger } from "../../utils/logger";

const githubIntegrationService = new GithubIntegrationService();

export class GithubScanReportService {
  async publishCompletedScan(repository: Repository, scan: Scan, issues: Issue[]) {
    const installationId = this.resolveInstallationId(repository, scan);
    if (!installationId || !scan.context.commitSha) {
      logger.info("Skipping GitHub check run for completed scan", {
        scanId: scan.id,
        repositoryId: repository.id,
        repositoryInstallationId: repository.githubInstallationId,
        scanInstallationId: scan.context.installationId,
        commitSha: scan.context.commitSha,
        reason: !installationId ? "missing_installation_id" : "missing_commit_sha",
      });
      return null;
    }

    const annotations = issues
      .filter((issue) => issue.filePath && issue.lineNumber)
      .slice(0, 20)
      .map((issue) => ({
        path: issue.filePath!,
        start_line: issue.lineNumber!,
        end_line: issue.lineNumber!,
        annotation_level: mapSeverityToAnnotationLevel(issue.severity),
        message: issue.description,
        title: issue.title,
        raw_details: issue.recommendation,
      }));

    logger.info("Attempting GitHub check run for completed scan", {
      scanId: scan.id,
      repositoryId: repository.id,
      installationId,
      owner: repository.owner,
      repositoryName: repository.name,
      commitSha: scan.context.commitSha,
      annotationCount: annotations.length,
      source: scan.context.source,
    });

    return githubIntegrationService.createCheckRun({
      installationId,
      owner: repository.owner,
      repository: repository.name,
      headSha: scan.context.commitSha,
      name: "AI Review Scan",
      title: "AI Review Scan",
      summary: buildSummaryText(scan, issues),
      text: buildDetailsText(scan, issues),
      conclusion: determineConclusion(issues),
      externalId: scan.id,
      annotations,
    });
  }

  async publishFailedScan(repository: Repository, scan: Scan, errorMessage: string) {
    const installationId = this.resolveInstallationId(repository, scan);
    if (!installationId || !scan.context.commitSha) {
      logger.info("Skipping GitHub check run for failed scan", {
        scanId: scan.id,
        repositoryId: repository.id,
        repositoryInstallationId: repository.githubInstallationId,
        scanInstallationId: scan.context.installationId,
        commitSha: scan.context.commitSha,
        reason: !installationId ? "missing_installation_id" : "missing_commit_sha",
      });
      return null;
    }

    logger.info("Attempting GitHub check run for failed scan", {
      scanId: scan.id,
      repositoryId: repository.id,
      installationId,
      owner: repository.owner,
      repositoryName: repository.name,
      commitSha: scan.context.commitSha,
      source: scan.context.source,
    });

    return githubIntegrationService.createCheckRun({
      installationId,
      owner: repository.owner,
      repository: repository.name,
      headSha: scan.context.commitSha,
      name: "AI Review Scan",
      title: "AI Review Scan Failed",
      summary: "The scan worker could not complete this analysis run.",
      text: errorMessage,
      conclusion: "failure",
      externalId: scan.id,
    });
  }

  private resolveInstallationId(repository: Repository, scan: Scan) {
    return scan.context.installationId ?? repository.githubInstallationId;
  }
}

const determineConclusion = (issues: Issue[]) => {
  if (issues.some((issue) => issue.severity === "critical" || issue.severity === "high")) {
    return "action_required" as const;
  }

  if (issues.length > 0) {
    return "neutral" as const;
  }

  return "success" as const;
};

const mapSeverityToAnnotationLevel = (severity: Issue["severity"]) => {
  switch (severity) {
    case "critical":
    case "high":
      return "failure" as const;
    case "medium":
      return "warning" as const;
    default:
      return "notice" as const;
  }
};

const buildSummaryText = (scan: Scan, issues: Issue[]) =>
  issues.length === 0
    ? `Scan completed with no findings. Source: ${scan.context.source}.`
    : `Scan completed with ${issues.length} finding(s). Critical/high findings require attention before merge.`;

const buildDetailsText = (scan: Scan, issues: Issue[]) => {
  const headline = [
    `Source: ${scan.context.source}`,
    `Branch: ${scan.context.branch ?? "n/a"}`,
    `Commit: ${scan.context.commitSha ?? "n/a"}`,
    `Changed files: ${scan.context.changedFiles.length}`,
  ].join("\n");

  const topIssues = issues
    .slice(0, 10)
    .map((issue, index) => `${index + 1}. [${issue.severity}] ${issue.title}${issue.filePath ? ` (${issue.filePath}${issue.lineNumber ? `:${issue.lineNumber}` : ""})` : ""}`)
    .join("\n");

  return topIssues ? `${headline}\n\nTop findings:\n${topIssues}` : headline;
};
