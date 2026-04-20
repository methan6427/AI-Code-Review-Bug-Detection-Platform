import type { Issue } from "@ai-review/shared";
import { env } from "../../config/env";
import { PlaceholderAIAnalysisService } from "../../services/analysis/PlaceholderAIAnalysisService";
import { RuleBasedStaticAnalysisService } from "../../services/analysis/RuleBasedStaticAnalysisService";
import { buildSummary } from "../../services/analysis/summary";
import { RepositorySourceService } from "../../services/repository-source/RepositorySourceService";
import { supabaseAdmin } from "../../services/supabase/client";
import type { ScanRow } from "../../types/database";
import { mapScan } from "../../utils/mappers";
import { badRequest } from "../../utils/http";
import { logger } from "../../utils/logger";
import { RepositoryService } from "../repositories/repository.service";
import { GithubScanReportService } from "./github-scan-report.service";
import { ScanEventService } from "./scan-event.service";

const staticAnalysisService = new RuleBasedStaticAnalysisService();
const aiAnalysisService = new PlaceholderAIAnalysisService();
const repositoryService = new RepositoryService();
const repositorySourceService = new RepositorySourceService();
const scanEventService = new ScanEventService();
const githubScanReportService = new GithubScanReportService();

export class ScanExecutionService {
  async execute(scanId: string) {
    const scan = await this.getScan(scanId);
    const repository = await repositoryService.getOwnedRepository(scan.triggeredBy, scan.repositoryId);

    try {
      const source = await repositorySourceService.load(repository, scan);
      await scanEventService.record(scan.id, {
        level: "info",
        stage: "source",
        message: "Repository source loaded for analysis",
        metadata: {
          sourceType: source.sourceType,
          changedFiles: source.changedFiles.length,
          installationId: repository.githubInstallationId,
        },
      });

      const context = {
        repositoryId: repository.id,
        files: source.files,
      };

      await scanEventService.record(scan.id, {
        level: "info",
        stage: "analysis",
        message: "Static and AI analysis started",
        metadata: {
          fileCount: source.files.length,
          attempt: scan.attemptCount,
        },
      });

      const staticIssues = await staticAnalysisService.analyze(context);
      const aiIssues = await aiAnalysisService.analyze(context);
      const issues = [...staticIssues, ...aiIssues];
      const summary = buildSummary(issues);

      const deleteResult = await supabaseAdmin.from("issues").delete().eq("scan_id", scan.id);
      if (deleteResult.error) {
        throw badRequest(deleteResult.error.message);
      }

      if (issues.length > 0) {
        const insertResult = await supabaseAdmin.from("issues").insert(
          issues.map((issue) => ({
            scan_id: scan.id,
            repository_id: repository.id,
            severity: issue.severity,
            category: issue.category,
            status: "open",
            title: issue.title,
            description: issue.description,
            recommendation: issue.recommendation,
            file_path: issue.filePath,
            line_number: issue.lineNumber,
            rule_code: issue.ruleCode,
            metadata: issue.metadata ?? {},
          })),
        );
        if (insertResult.error) {
          throw badRequest(insertResult.error.message);
        }
      }

      let githubCheckRunId: number | null = null;
      try {
        githubCheckRunId = await githubScanReportService.publishCompletedScan(repository, scan, mapIssuesForGithubReport(scan.id, repository.id, issues));
        if (githubCheckRunId) {
          await scanEventService.record(scan.id, {
            level: "info",
            stage: "report",
            message: "Published GitHub check run for completed scan",
            metadata: {
              githubCheckRunId,
            },
          });
        }
      } catch (reportError) {
        await scanEventService.record(scan.id, {
          level: "warn",
          stage: "report",
          message: "GitHub check run publication failed",
          metadata: {
            message: reportError instanceof Error ? reportError.message : "Unknown GitHub reporting error",
          },
        });
      }

      const completedAt = new Date().toISOString();
      const completeResult = await supabaseAdmin
        .from("scans")
        .update({
          status: "completed",
          summary,
          completed_at: completedAt,
          scan_context: {
            ...scan.context,
            changedFiles: source.changedFiles,
            sourceType: source.sourceType,
          },
          last_error_at: null,
          last_error_details: {},
          github_check_run_id: githubCheckRunId,
        })
        .eq("id", scan.id);
      if (completeResult.error) {
        throw badRequest(completeResult.error.message);
      }

      await repositoryService.markLastScan(repository.id, completedAt);
      await scanEventService.record(scan.id, {
        level: "info",
        stage: "completed",
        message: "Scan completed successfully",
        metadata: {
          issueCount: issues.length,
          sourceType: source.sourceType,
          githubCheckRunId,
        },
      });
      logger.info("Scan completed", {
        scanId: scan.id,
        repositoryId: repository.id,
        sourceType: source.sourceType,
        changedFiles: source.changedFiles.length,
        githubCheckRunId,
      });
    } catch (error) {
      await this.handleFailure(scan.id, error);
      throw error;
    }
  }

  private async handleFailure(scanId: string, error: unknown) {
    const scan = await this.getScan(scanId);
    const repository = await repositoryService.getOwnedRepository(scan.triggeredBy, scan.repositoryId);
    const errorMessage = error instanceof Error ? error.message : "Scan failed";
    const errorStack = error instanceof Error ? error.stack ?? null : null;
    const now = new Date();
    const canRetry = scan.attemptCount < scan.maxAttempts;
    const nextRetryAt = canRetry ? new Date(now.getTime() + this.getRetryDelayMs(scan.attemptCount)).toISOString() : null;

    const updateResult = await supabaseAdmin
      .from("scans")
      .update({
        status: canRetry ? "queued" : "failed",
        error_message: errorMessage,
        completed_at: canRetry ? null : now.toISOString(),
        next_retry_at: nextRetryAt,
        last_error_at: now.toISOString(),
        last_error_details: {
          message: errorMessage,
          stack: errorStack,
          attempt: scan.attemptCount,
          maxAttempts: scan.maxAttempts,
        },
      })
      .eq("id", scan.id);

    if (updateResult.error) {
      throw badRequest(updateResult.error.message);
    }

    await scanEventService.record(scan.id, {
      level: canRetry ? "warn" : "error",
      stage: canRetry ? "retry" : "failed",
      message: canRetry ? "Scan failed and was re-queued for retry" : "Scan failed after exhausting retries",
      metadata: {
        message: errorMessage,
        attempt: scan.attemptCount,
        maxAttempts: scan.maxAttempts,
        nextRetryAt,
      },
    });

    if (!canRetry) {
      try {
        const githubCheckRunId = await githubScanReportService.publishFailedScan(repository, scan, errorMessage);
        if (githubCheckRunId) {
          await supabaseAdmin.from("scans").update({ github_check_run_id: githubCheckRunId }).eq("id", scan.id);
          await scanEventService.record(scan.id, {
            level: "info",
            stage: "report",
            message: "Published failed-scan GitHub check run",
            metadata: {
              githubCheckRunId,
            },
          });
        }
      } catch (reportError) {
        await scanEventService.record(scan.id, {
          level: "warn",
          stage: "report",
          message: "GitHub failed-scan reporting could not be completed",
          metadata: {
            message: reportError instanceof Error ? reportError.message : "Unknown GitHub reporting error",
          },
        });
      }
    }
  }

  private getRetryDelayMs(attemptCount: number) {
    return env.SCAN_RETRY_BASE_DELAY_MS * Math.max(1, attemptCount);
  }

  private async getScan(scanId: string) {
    const { data, error } = await supabaseAdmin.from("scans").select("*").eq("id", scanId).single<ScanRow>();
    if (error || !data) {
      throw badRequest(error?.message ?? "Unable to load scan");
    }

    return mapScan(data);
  }
}

const mapIssuesForGithubReport = (scanId: string, repositoryId: string, issues: Array<{
  severity: Issue["severity"];
  category: Issue["category"];
  title: string;
  description: string;
  recommendation: string;
  filePath: string | null;
  lineNumber: number | null;
  ruleCode: string;
  metadata?: Record<string, unknown>;
}>): Issue[] =>
  issues.map((issue, index) => ({
    id: `${scanId}-${index}`,
    scanId,
    repositoryId,
    severity: issue.severity,
    category: issue.category,
    status: "open",
    title: issue.title,
    description: issue.description,
    recommendation: issue.recommendation,
    filePath: issue.filePath,
    lineNumber: issue.lineNumber,
    ruleCode: issue.ruleCode,
    metadata: issue.metadata ?? {},
    triageNote: null,
    assignedTo: null,
    lastStatusChangedAt: null,
    lastStatusChangedBy: null,
    createdAt: new Date().toISOString(),
  }));
