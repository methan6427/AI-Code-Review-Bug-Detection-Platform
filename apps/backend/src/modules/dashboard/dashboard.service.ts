import type { DashboardSummary, IssueSeverity, Profile } from "@ai-review/shared";
import type { IssueRow, RepositoryRow, ScanRow } from "../../types/database";
import { mapRepository, mapScan } from "../../utils/mappers";
import { badRequest } from "../../utils/http";
import { supabaseAdmin } from "../../services/supabase/client";
import { logger } from "../../utils/logger";

const severityKeys: IssueSeverity[] = ["critical", "high", "medium", "low", "info"];
const dashboardQueryTimeoutMs = 6_000;

type QueryResult<T> = { data?: T | null; error: { message: string } | null };
type CountQueryResult = { count?: number | null; error: { message: string } | null };

const withTimeout = async <T>(promise: PromiseLike<T>, label: string): Promise<T> =>
  Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${dashboardQueryTimeoutMs}ms`)), dashboardQueryTimeoutMs);
    }),
  ]);

export class DashboardService {
  async getSummary(userId: string, profile: Profile): Promise<DashboardSummary> {
    logger.info("Dashboard summary query start", { userId });

    const repositoryQueryStartedAt = Date.now();
    const repositoryResult = await withTimeout<QueryResult<RepositoryRow[]>>(
      supabaseAdmin.from("repositories").select("*").eq("user_id", userId).returns<RepositoryRow[]>(),
      "Dashboard repositories query",
    );

    if (repositoryResult.error) {
      logger.error("Dashboard repositories query failed", {
        userId,
        durationMs: Date.now() - repositoryQueryStartedAt,
        error: repositoryResult.error.message,
      });
      throw badRequest(repositoryResult.error.message);
    }

    logger.info("Dashboard repositories query completed", {
      userId,
      durationMs: Date.now() - repositoryQueryStartedAt,
      repositoryCount: repositoryResult.data?.length ?? 0,
    });

    const repositories = (repositoryResult.data ?? []).map(mapRepository);
    const repositoryIds = repositories.map((repository) => repository.id);

    const fanoutStartedAt = Date.now();
    const [recentScanResult, scanCountResult, issueResult] = await Promise.all([
      repositoryIds.length > 0
        ? withTimeout<QueryResult<ScanRow[]>>(
            supabaseAdmin.from("scans").select("*").in("repository_id", repositoryIds).order("created_at", { ascending: false }).limit(5).returns<ScanRow[]>(),
            "Dashboard recent scans query",
          )
        : Promise.resolve({ data: [], error: null }),
      repositoryIds.length > 0
        ? withTimeout<CountQueryResult>(
            supabaseAdmin.from("scans").select("*", { count: "exact", head: true }).in("repository_id", repositoryIds),
            "Dashboard scan count query",
          )
        : Promise.resolve({ count: 0, error: null }),
      repositoryIds.length > 0
        ? withTimeout<QueryResult<Array<Pick<IssueRow, "severity" | "status">>>>(
            supabaseAdmin.from("issues").select("severity, status").in("repository_id", repositoryIds).returns<Array<Pick<IssueRow, "severity" | "status">>>(),
            "Dashboard issues query",
          )
        : Promise.resolve({ data: [], error: null }),
    ]);

    logger.info("Dashboard Supabase fanout completed", {
      userId,
      durationMs: Date.now() - fanoutStartedAt,
      recentScansError: recentScanResult.error?.message ?? null,
      scanCountError: scanCountResult.error?.message ?? null,
      issuesError: issueResult.error?.message ?? null,
      recentScanCount: recentScanResult.data?.length ?? 0,
      totalScanCount: scanCountResult.count ?? 0,
      issueRowCount: issueResult.data?.length ?? 0,
    });

    if (recentScanResult.error) {
      throw badRequest(recentScanResult.error.message);
    }
    if (scanCountResult.error) {
      throw badRequest(scanCountResult.error.message);
    }
    if (issueResult.error) {
      throw badRequest(issueResult.error.message);
    }

    const issueCountsBySeverity = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    };

    let openIssueCount = 0;
    for (const issue of issueResult.data ?? []) {
      issueCountsBySeverity[issue.severity] += 1;
      if (issue.status === "open") {
        openIssueCount += 1;
      }
    }

    const repositoryLookup = new Map(repositories.map((repository) => [repository.id, repository]));

    const recentScans = (recentScanResult.data ?? []).map((scanRow) => {
      const repositoryMeta = repositoryLookup.get(scanRow.repository_id);
      return {
        ...mapScan(scanRow),
        repositoryName: repositoryMeta?.name ?? "Unknown",
        repositoryOwner: repositoryMeta?.owner ?? "Unknown",
      };
    });

    return {
      profile,
      metrics: {
        repositoryCount: repositories.length,
        scanCount: scanCountResult.count ?? 0,
        openIssueCount,
        criticalIssueCount: issueCountsBySeverity.critical,
      },
      issueCountsBySeverity: severityKeys.reduce<Record<IssueSeverity, number>>((accumulator, severity) => {
        accumulator[severity] = issueCountsBySeverity[severity];
        return accumulator;
      }, {} as Record<IssueSeverity, number>),
      recentScans,
      repositories,
    };
  }
}
