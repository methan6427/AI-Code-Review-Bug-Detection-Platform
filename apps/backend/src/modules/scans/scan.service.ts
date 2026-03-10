import type { ScanContext } from "@ai-review/shared";
import { env } from "../../config/env";
import type { IssueRow, ScanRow } from "../../types/database";
import { mapIssue, mapScan } from "../../utils/mappers";
import { badRequest, conflict, notFound } from "../../utils/http";
import { supabaseAdmin } from "../../services/supabase/client";
import { RepositoryService } from "../repositories/repository.service";
import { buildScanContext, type CreateScanContextInput } from "./scan-context";
import { ScanEventService } from "./scan-event.service";

const repositoryService = new RepositoryService();
const scanEventService = new ScanEventService();

export class ScanService {
  async createScan(userId: string, repositoryId: string, contextInput?: CreateScanContextInput) {
    const repository = await repositoryService.getOwnedRepository(userId, repositoryId);
    const activeScan = await this.getActiveScan(repositoryId);
    if (activeScan) {
      throw conflict("A scan is already queued or running for this repository");
    }

    const { data, error } = await supabaseAdmin
      .from("scans")
      .insert({
        repository_id: repositoryId,
        triggered_by: userId,
        status: "queued",
        error_message: null,
        scan_context: buildScanContext(repository.branch, contextInput),
        max_attempts: env.SCAN_MAX_ATTEMPTS,
      })
      .select("*")
      .single<ScanRow>();

    if (error || !data) {
      throw badRequest(error?.message ?? "Unable to create scan");
    }

    const scan = mapScan(data);
    await scanEventService.record(scan.id, {
      level: "info",
      stage: "queued",
      message: "Scan queued for worker execution",
      metadata: {
        source: scan.context.source,
        branch: scan.context.branch,
        commitSha: scan.context.commitSha,
      },
    });

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

    const events = await scanEventService.listByScan(scanId);

    return {
      scan: mapScan(scanData),
      repository,
      issues: (issueData ?? []).map(mapIssue),
      events,
    };
  }

  async claimNextQueuedScan() {
    const now = new Date().toISOString();
    const { data: queuedScan, error: queuedError } = await supabaseAdmin
      .from("scans")
      .select("*")
      .eq("status", "queued")
      .or(`next_retry_at.is.null,next_retry_at.lte.${now}`)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle<ScanRow>();

    if (queuedError) {
      throw badRequest(queuedError.message);
    }

    if (!queuedScan) {
      return null;
    }

    const startedAt = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from("scans")
      .update({
        status: "running",
        started_at: startedAt,
        error_message: null,
        next_retry_at: null,
        attempt_count: queuedScan.attempt_count + 1,
      })
      .eq("id", queuedScan.id)
      .eq("status", "queued")
      .select("*")
      .maybeSingle<ScanRow>();

    if (error) {
      throw badRequest(error.message);
    }

    const claimed = data ? mapScan(data) : null;
    if (claimed) {
      await scanEventService.record(claimed.id, {
        level: "info",
        stage: "claimed",
        message: "Worker claimed queued scan",
        metadata: {
          attempt: claimed.attemptCount,
          maxAttempts: claimed.maxAttempts,
        },
      });
    }

    return claimed;
  }

  async updateContext(scanId: string, context: ScanContext) {
    const { error } = await supabaseAdmin.from("scans").update({ scan_context: context }).eq("id", scanId);
    if (error) {
      throw badRequest(error.message);
    }
  }

  private async getActiveScan(repositoryId: string) {
    const { data, error } = await supabaseAdmin
      .from("scans")
      .select("*")
      .eq("repository_id", repositoryId)
      .in("status", ["queued", "running"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<ScanRow>();

    if (error) {
      throw badRequest(error.message);
    }

    return data ? mapScan(data) : null;
  }
}
