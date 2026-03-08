import type { ScanSummary } from "@ai-review/shared";
import type { AnalysisIssue } from "./types";

export const createEmptySummary = (): ScanSummary => ({
  totalIssues: 0,
  criticalCount: 0,
  highCount: 0,
  mediumCount: 0,
  lowCount: 0,
  infoCount: 0,
  categories: {
    bug: 0,
    security: 0,
    performance: 0,
    maintainability: 0,
  },
});

export const buildSummary = (issues: AnalysisIssue[]): ScanSummary => {
  const summary = createEmptySummary();
  summary.totalIssues = issues.length;

  for (const issue of issues) {
    summary.categories[issue.category] += 1;

    switch (issue.severity) {
      case "critical":
        summary.criticalCount += 1;
        break;
      case "high":
        summary.highCount += 1;
        break;
      case "medium":
        summary.mediumCount += 1;
        break;
      case "low":
        summary.lowCount += 1;
        break;
      case "info":
        summary.infoCount += 1;
        break;
    }
  }

  return summary;
};

