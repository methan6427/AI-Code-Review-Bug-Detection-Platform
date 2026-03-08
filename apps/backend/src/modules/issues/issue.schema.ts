import { issueCategories, issueSeverities, issueStatuses } from "@ai-review/shared";
import { z } from "zod";

export const issueQuerySchema = z.object({
  severity: z.enum(issueSeverities).optional(),
  category: z.enum(issueCategories).optional(),
  status: z.enum(issueStatuses).optional(),
});

