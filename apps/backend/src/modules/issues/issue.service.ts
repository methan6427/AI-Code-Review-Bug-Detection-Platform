import type { Issue, IssueFilters, IssueStatus } from "@ai-review/shared";
import type { IssueActivityRow, IssueRow, ScanRow } from "../../types/database";
import { RepositoryService } from "../repositories/repository.service";
import { mapIssue, mapIssueActivity } from "../../utils/mappers";
import { badRequest, notFound } from "../../utils/http";
import { logger } from "../../utils/logger";
import { supabaseAdmin } from "../../services/supabase/client";

const repositoryService = new RepositoryService();

type TriageInput = {
  status?: IssueStatus;
  triageNote?: string | null;
  assignedTo?: string | null;
};

type BulkInput = {
  issueIds: string[];
  status?: IssueStatus;
  assignedTo?: string | null;
};

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

  async updateStatus(userId: string, issueId: string, status: IssueStatus) {
    return this.updateTriage(userId, issueId, { status });
  }

  async updateTriage(userId: string, issueId: string, input: TriageInput) {
    const repositoryIds = await repositoryService.listOwnedRepositoryIds(userId);
    if (repositoryIds.length === 0) {
      throw notFound("Issue not found");
    }

    const existing = await supabaseAdmin
      .from("issues")
      .select("*")
      .eq("id", issueId)
      .in("repository_id", repositoryIds)
      .single<IssueRow>();

    if (existing.error || !existing.data) {
      throw notFound("Issue not found");
    }

    const previous = existing.data;
    const updates: Partial<IssueRow> = {};
    const activityEntries: Array<Omit<IssueActivityRow, "id" | "created_at">> = [];
    const nowIso = new Date().toISOString();

    if (input.status !== undefined && input.status !== previous.status) {
      updates.status = input.status;
      updates.last_status_changed_at = nowIso;
      updates.last_status_changed_by = userId;
      activityEntries.push({
        issue_id: issueId,
        actor_id: userId,
        action: "status_changed",
        previous_value: { status: previous.status },
        next_value: { status: input.status },
        note: null,
      });
    }

    if (input.assignedTo !== undefined && input.assignedTo !== previous.assigned_to) {
      updates.assigned_to = input.assignedTo;
      activityEntries.push({
        issue_id: issueId,
        actor_id: userId,
        action: input.assignedTo ? "assigned" : "unassigned",
        previous_value: { assignedTo: previous.assigned_to },
        next_value: { assignedTo: input.assignedTo },
        note: null,
      });
    }

    if (input.triageNote !== undefined) {
      const normalizedNote = input.triageNote === "" ? null : input.triageNote;
      if (normalizedNote !== previous.triage_note) {
        updates.triage_note = normalizedNote;
        const action: IssueActivityRow["action"] = normalizedNote
          ? previous.triage_note
            ? "note_updated"
            : "note_added"
          : "note_cleared";
        activityEntries.push({
          issue_id: issueId,
          actor_id: userId,
          action,
          previous_value: { triageNote: previous.triage_note },
          next_value: { triageNote: normalizedNote },
          note: normalizedNote,
        });
      }
    }

    if (Object.keys(updates).length === 0) {
      return mapIssue(previous);
    }

    const { data, error } = await supabaseAdmin
      .from("issues")
      .update(updates)
      .eq("id", issueId)
      .in("repository_id", repositoryIds)
      .select("*")
      .single<IssueRow>();

    if (error || !data) {
      throw badRequest(error?.message ?? "Unable to update issue");
    }

    if (activityEntries.length > 0) {
      const insertResult = await supabaseAdmin.from("issue_activity").insert(activityEntries);
      if (insertResult.error) {
        logger.warn("Failed to insert issue activity", {
          issueId,
          message: insertResult.error.message,
        });
      }
    }

    return mapIssue(data);
  }

  async bulkUpdate(userId: string, input: BulkInput) {
    const repositoryIds = await repositoryService.listOwnedRepositoryIds(userId);
    if (repositoryIds.length === 0) {
      throw notFound("No accessible issues");
    }

    const lookup = await supabaseAdmin
      .from("issues")
      .select("*")
      .in("id", input.issueIds)
      .in("repository_id", repositoryIds)
      .returns<IssueRow[]>();

    if (lookup.error) {
      throw badRequest(lookup.error.message);
    }

    const accessibleRows = lookup.data ?? [];
    const accessibleIds = new Set(accessibleRows.map((row) => row.id));
    const failedIds = input.issueIds.filter((id) => !accessibleIds.has(id));

    const updated: Issue[] = [];
    for (const row of accessibleRows) {
      const result = await this.updateTriage(userId, row.id, {
        status: input.status,
        assignedTo: input.assignedTo,
      });
      updated.push(result);
    }

    return { updated, failedIds };
  }

  async listActivity(userId: string, issueId: string) {
    const repositoryIds = await repositoryService.listOwnedRepositoryIds(userId);
    if (repositoryIds.length === 0) {
      throw notFound("Issue not found");
    }

    const ownerCheck = await supabaseAdmin
      .from("issues")
      .select("id")
      .eq("id", issueId)
      .in("repository_id", repositoryIds)
      .single<Pick<IssueRow, "id">>();

    if (ownerCheck.error || !ownerCheck.data) {
      throw notFound("Issue not found");
    }

    const { data, error } = await supabaseAdmin
      .from("issue_activity")
      .select("*")
      .eq("issue_id", issueId)
      .order("created_at", { ascending: false })
      .returns<IssueActivityRow[]>();

    if (error) {
      throw badRequest(error.message);
    }

    return (data ?? []).map(mapIssueActivity);
  }
}
