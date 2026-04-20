import { issueCategories, issueSeverities, issueStatuses } from "@ai-review/shared";
import { z } from "zod";

export const issueQuerySchema = z.object({
  severity: z.enum(issueSeverities).optional(),
  category: z.enum(issueCategories).optional(),
  status: z.enum(issueStatuses).optional(),
});

export const issueIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const updateIssueStatusSchema = z.object({
  status: z.enum(issueStatuses),
});

export const updateIssueTriageSchema = z
  .object({
    status: z.enum(issueStatuses).optional(),
    triageNote: z.string().trim().max(2000).nullable().optional(),
    assignedTo: z.string().uuid().nullable().optional(),
  })
  .refine(
    (value) =>
      value.status !== undefined ||
      value.triageNote !== undefined ||
      value.assignedTo !== undefined,
    { message: "At least one of status, triageNote, or assignedTo must be provided" },
  );

export const bulkUpdateIssuesSchema = z
  .object({
    issueIds: z.array(z.string().uuid()).min(1).max(100),
    status: z.enum(issueStatuses).optional(),
    assignedTo: z.string().uuid().nullable().optional(),
  })
  .refine((value) => value.status !== undefined || value.assignedTo !== undefined, {
    message: "At least one of status or assignedTo must be provided",
  });
