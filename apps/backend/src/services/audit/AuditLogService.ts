import type { Request } from "express";
import { logger } from "../../utils/logger";
import { supabaseAdmin } from "../supabase/client";

export type AuditAction =
  | "auth.login"
  | "auth.signup"
  | "auth.logout"
  | "repository.created"
  | "repository.updated"
  | "repository.deleted"
  | "repository.imported"
  | "scan.triggered"
  | "scan.webhook"
  | "issue.status_changed"
  | "issue.assigned"
  | "issue.note_updated"
  | "issue.bulk_updated";

export type AuditResourceType = "auth" | "repository" | "scan" | "issue";

type RecordInput = {
  actorId?: string | null;
  actorEmail?: string | null;
  action: AuditAction;
  resourceType: AuditResourceType;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
  request?: Request;
};

export class AuditLogService {
  async record(input: RecordInput) {
    const ip =
      input.request?.ip ?? (input.request?.headers["x-forwarded-for"] as string | undefined) ?? null;
    const userAgent = (input.request?.headers["user-agent"] as string | undefined) ?? null;

    const { error } = await supabaseAdmin.from("audit_logs").insert({
      actor_id: input.actorId ?? null,
      actor_email: input.actorEmail ?? null,
      action: input.action,
      resource_type: input.resourceType,
      resource_id: input.resourceId ?? null,
      metadata: input.metadata ?? {},
      ip_address: ip,
      user_agent: userAgent,
    });

    if (error) {
      logger.warn("Audit log insert failed", {
        action: input.action,
        resourceType: input.resourceType,
        message: error.message,
      });
    }
  }
}

export const auditLogService = new AuditLogService();
