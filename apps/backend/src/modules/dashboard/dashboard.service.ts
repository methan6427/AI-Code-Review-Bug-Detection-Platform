import type { DashboardSummary, IssueSeverity } from "@ai-review/shared";
import type { IssueRow, ProfileRow, RepositoryRow, ScanRow } from "../../types/database";
import { RepositoryService } from "../repositories/repository.service";
import { mapProfile, mapRepository, mapScan } from "../../utils/mappers";
import { badRequest, unauthorized } from "../../utils/http";
import { supabaseAdmin } from "../../services/supabase/client";

const severityKeys: IssueSeverity[] = ["critical", "high", "medium", "low", "info"];
const repositoryService = new RepositoryService();

export class DashboardService {
  async getSummary(userId: string): Promise<DashboardSummary> {
    const repositoryIds = await repositoryService.listOwnedRepositoryIds(userId);
    const [profileResult, repositoryResult, recentScanResult, scanCountResult, issueResult] = await Promise.all([
      supabaseAdmin.from("profiles").select("*").eq("id", userId).single<ProfileRow>(),
      supabaseAdmin.from("repositories").select("*").eq("user_id", userId).returns<RepositoryRow[]>(),
      repositoryIds.length > 0
        ? supabaseAdmin.from("scans").select("*").in("repository_id", repositoryIds).order("created_at", { ascending: false }).limit(5).returns<ScanRow[]>()
        : Promise.resolve({ data: [], error: null }),
      repositoryIds.length > 0
        ? supabaseAdmin.from("scans").select("*", { count: "exact", head: true }).in("repository_id", repositoryIds)
        : Promise.resolve({ count: 0, error: null }),
      repositoryIds.length > 0
        ? supabaseAdmin.from("issues").select("severity, status").in("repository_id", repositoryIds).returns<Array<Pick<IssueRow, "severity" | "status">>>()
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (profileResult.error || !profileResult.data) {
      throw unauthorized("Profile not found");
    }
    if (repositoryResult.error) {
      throw badRequest(repositoryResult.error.message);
    }
    if (recentScanResult.error) {
      throw badRequest(recentScanResult.error.message);
    }
    if (scanCountResult.error) {
      throw badRequest(scanCountResult.error.message);
    }
    if (issueResult.error) {
      throw badRequest(issueResult.error.message);
    }

    const repositories = (repositoryResult.data ?? []).map(mapRepository);
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
      profile: mapProfile(profileResult.data),
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
