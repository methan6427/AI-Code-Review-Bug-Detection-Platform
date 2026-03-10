import type { Request, Response } from "express";
import { issueIdParamSchema, issueQuerySchema, updateIssueStatusSchema } from "./issue.schema";
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
    return response.json({ issue });
  }
}
