import type { Request, Response } from "express";
import { auditLogService } from "../../services/audit/AuditLogService";
import {
  bulkUpdateIssuesSchema,
  issueIdParamSchema,
  issueQuerySchema,
  updateIssueStatusSchema,
  updateIssueTriageSchema,
} from "./issue.schema";
import { scanIdParamSchema } from "../scans/scan.schema";
import { IssueService } from "./issue.service";

const issueService = new IssueService();

export class IssueController {
  async listByScan(request: Request, response: Response) {
    const params = scanIdParamSchema.parse(request.params);
    const filters = issueQuerySchema.parse(request.query);
    const issues = await issueService.listByScan(request.auth!.user.id, params.id, filters);
    return response.json({ issues });
  }

  async updateStatus(request: Request, response: Response) {
    const params = issueIdParamSchema.parse(request.params);
    const input = updateIssueStatusSchema.parse(request.body);
    const issue = await issueService.updateStatus(request.auth!.user.id, params.id, input.status);
    await auditLogService.record({
      actorId: request.auth!.user.id,
      actorEmail: request.auth!.user.email,
      action: "issue.status_changed",
      resourceType: "issue",
      resourceId: params.id,
      metadata: { status: input.status },
      request,
    });
    return response.json({ issue });
  }

  async updateTriage(request: Request, response: Response) {
    const params = issueIdParamSchema.parse(request.params);
    const input = updateIssueTriageSchema.parse(request.body);
    const issue = await issueService.updateTriage(request.auth!.user.id, params.id, input);

    if (input.status !== undefined) {
      await auditLogService.record({
        actorId: request.auth!.user.id,
        actorEmail: request.auth!.user.email,
        action: "issue.status_changed",
        resourceType: "issue",
        resourceId: params.id,
        metadata: { status: input.status },
        request,
      });
    }
    if (input.assignedTo !== undefined) {
      await auditLogService.record({
        actorId: request.auth!.user.id,
        actorEmail: request.auth!.user.email,
        action: "issue.assigned",
        resourceType: "issue",
        resourceId: params.id,
        metadata: { assignedTo: input.assignedTo },
        request,
      });
    }
    if (input.triageNote !== undefined) {
      await auditLogService.record({
        actorId: request.auth!.user.id,
        actorEmail: request.auth!.user.email,
        action: "issue.note_updated",
        resourceType: "issue",
        resourceId: params.id,
        request,
      });
    }

    return response.json({ issue });
  }

  async bulkUpdate(request: Request, response: Response) {
    const input = bulkUpdateIssuesSchema.parse(request.body);
    const result = await issueService.bulkUpdate(request.auth!.user.id, input);
    await auditLogService.record({
      actorId: request.auth!.user.id,
      actorEmail: request.auth!.user.email,
      action: "issue.bulk_updated",
      resourceType: "issue",
      metadata: {
        requestedCount: input.issueIds.length,
        updatedCount: result.updated.length,
        failedCount: result.failedIds.length,
        status: input.status ?? null,
        assignedTo: input.assignedTo ?? null,
      },
      request,
    });
    return response.json(result);
  }

  async listActivity(request: Request, response: Response) {
    const params = issueIdParamSchema.parse(request.params);
    const activity = await issueService.listActivity(request.auth!.user.id, params.id);
    return response.json({ activity });
  }
}
