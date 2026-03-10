import type { IssueFilters } from "@ai-review/shared";
import type { IssueRow, ScanRow } from "../../types/database";
import { RepositoryService } from "../repositories/repository.service";
import { mapIssue } from "../../utils/mappers";
import { badRequest, notFound } from "../../utils/http";
import { supabaseAdmin } from "../../services/supabase/client";

const repositoryService = new RepositoryService();

export class IssueService {
  async listByScan(userId: string, scanId: string, filters: IssueFilters) {
    const repositoryIds = await repositoryService.listOwnedRepositoryIds(userId);
    if (repositoryIds.length === 0) {
      throw notFound("Scan not found");
    }

    const scanLookup = await supabaseAdmin
      .from("scans")
      .select("id")
      .eq("id", scanId)
      .in("repository_id", repositoryIds)
      .single<Pick<ScanRow, "id">>();

    if (scanLookup.error || !scanLookup.data) {
      throw notFound("Scan not found");
    }

    let query = supabaseAdmin.from("issues").select("*").eq("scan_id", scanId).in("repository_id", repositoryIds);

    if (filters.severity) {
      query = query.eq("severity", filters.severity);
    }
    if (filters.category) {
      query = query.eq("category", filters.category);
    }
    if (filters.status) {
      query = query.eq("status", filters.status);
    }

    const { data, error } = await query.returns<IssueRow[]>();

    if (error) {
      throw badRequest(error.message);
    }

    return (data ?? []).map(mapIssue);
  }

  async updateStatus(userId: string, issueId: string, status: IssueRow["status"]) {
    const repositoryIds = await repositoryService.listOwnedRepositoryIds(userId);
    if (repositoryIds.length === 0) {
      throw notFound("Issue not found");
    }

    const issueLookup = await supabaseAdmin
      .from("issues")
      .select("*")
      .eq("id", issueId)
      .in("repository_id", repositoryIds)
      .single<IssueRow>();

    if (issueLookup.error || !issueLookup.data) {
      throw notFound("Issue not found");
    }

    const { data, error } = await supabaseAdmin
      .from("issues")
      .update({ status })
      .eq("id", issueId)
      .in("repository_id", repositoryIds)
      .select("*")
      .single<IssueRow>();

    if (error || !data) {
      throw badRequest(error?.message ?? "Unable to update issue status");
    }

    return mapIssue(data);
  }
}
