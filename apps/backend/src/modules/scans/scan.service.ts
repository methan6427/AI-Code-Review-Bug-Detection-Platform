import type { AnalysisIssue, ScanExecutionResult, ScanOrchestrator } from "../../services/analysis/types";
import { PlaceholderAIAnalysisService } from "../../services/analysis/PlaceholderAIAnalysisService";
import { RuleBasedStaticAnalysisService } from "../../services/analysis/RuleBasedStaticAnalysisService";
import { buildSummary } from "../../services/analysis/summary";
import { RepositoryService } from "../repositories/repository.service";
import type { IssueRow, ScanRow } from "../../types/database";
import { mapIssue, mapScan } from "../../utils/mappers";
import { badRequest, notFound } from "../../utils/http";
import { supabaseAdmin } from "../../services/supabase/client";

const staticAnalysisService = new RuleBasedStaticAnalysisService();
const aiAnalysisService = new PlaceholderAIAnalysisService();
const repositoryService = new RepositoryService();

class DefaultScanOrchestrator implements ScanOrchestrator {
  async runScan(input: { repositoryId: string; scanId: string; triggeredBy: string }): Promise<void> {
    const now = new Date().toISOString();

    const runningResult = await supabaseAdmin
      .from("scans")
      .update({ status: "running", started_at: now })
      .eq("id", input.scanId);
    if (runningResult.error) {
      throw badRequest(runningResult.error.message);
    }

    try {
      const repository = await repositoryService.getOwnedRepository(input.triggeredBy, input.repositoryId);
      const context = {
        repositoryId: repository.id,
        files: repository.sampleFiles,
      };

      const staticIssues = await staticAnalysisService.analyze(context);
      const aiIssues = await aiAnalysisService.analyze(context);
      const result = this.buildExecutionResult([...staticIssues, ...aiIssues]);

      const deleteResult = await supabaseAdmin.from("issues").delete().eq("scan_id", input.scanId);
      if (deleteResult.error) {
        throw badRequest(deleteResult.error.message);
      }

      if (result.issues.length > 0) {
        const insertResult = await supabaseAdmin.from("issues").insert(
          result.issues.map((issue) => ({
            scan_id: input.scanId,
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

      const completedAt = new Date().toISOString();

      const completeResult = await supabaseAdmin
        .from("scans")
        .update({
          status: "completed",
          summary: result.summary,
          completed_at: completedAt,
        })
        .eq("id", input.scanId);
      if (completeResult.error) {
        throw badRequest(completeResult.error.message);
      }

      await repositoryService.markLastScan(repository.id, completedAt);
    } catch (error) {
      const failureResult = await supabaseAdmin
        .from("scans")
        .update({
          status: "failed",
          error_message: error instanceof Error ? error.message : "Scan failed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", input.scanId);
      if (failureResult.error) {
        throw badRequest(failureResult.error.message);
      }

      throw error;
    }
  }

  private buildExecutionResult(issues: AnalysisIssue[]): ScanExecutionResult {
    return {
      issues,
      summary: buildSummary(issues),
    };
  }
}

const orchestrator = new DefaultScanOrchestrator();

export class ScanService {
  async createScan(userId: string, repositoryId: string) {
    await repositoryService.getOwnedRepository(userId, repositoryId);

    const { data, error } = await supabaseAdmin
      .from("scans")
      .insert({
        repository_id: repositoryId,
        triggered_by: userId,
        status: "queued",
      })
      .select("*")
      .single<ScanRow>();

    if (error || !data) {
      throw badRequest(error?.message ?? "Unable to create scan");
    }

    const scan = mapScan(data);
    void orchestrator.runScan({ repositoryId, scanId: scan.id, triggeredBy: userId });

    return scan;
  }

  async listByUser(userId: string) {
    const repositoryIds = await repositoryService.listOwnedRepositoryIds(userId);
    if (repositoryIds.length === 0) {
      return [];
    }

    const { data, error } = await supabaseAdmin
      .from("scans")
      .select("*")
      .in("repository_id", repositoryIds)
      .order("created_at", { ascending: false })
      .returns<ScanRow[]>();

    if (error) {
      throw badRequest(error.message);
    }

    return (data ?? []).map(mapScan);
  }

  async getDetail(userId: string, scanId: string) {
    const { data: scanData, error: scanError } = await supabaseAdmin
      .from("scans")
      .select("*")
      .eq("id", scanId)
      .single<ScanRow>();

    if (scanError || !scanData) {
      throw notFound("Scan not found");
    }

    const repository = await repositoryService.getOwnedRepository(userId, scanData.repository_id);

    const { data: issueData, error: issueError } = await supabaseAdmin
      .from("issues")
      .select("*")
      .eq("scan_id", scanId)
      .order("severity", { ascending: true })
      .returns<IssueRow[]>();

    if (issueError) {
      throw badRequest(issueError.message);
    }

    return {
      scan: mapScan(scanData),
      repository,
      issues: (issueData ?? []).map(mapIssue),
    };
  }
}
