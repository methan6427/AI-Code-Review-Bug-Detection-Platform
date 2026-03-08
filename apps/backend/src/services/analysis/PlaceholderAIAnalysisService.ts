import type { AIAnalysisService, AnalysisContext, AnalysisIssue } from "./types";

export class PlaceholderAIAnalysisService implements AIAnalysisService {
  async analyze(context: AnalysisContext): Promise<AnalysisIssue[]> {
    const issues: AnalysisIssue[] = [];

    for (const file of context.files) {
      if (file.content.length > 800 && !file.content.includes("/**")) {
        issues.push({
          title: "Low-documentation hotspot",
          description: "This file is relatively large and lacks top-level documentation, which may slow down code review and onboarding.",
          severity: "low",
          category: "maintainability",
          filePath: file.path,
          lineNumber: 1,
          recommendation: "Add a short module comment or split the file into smaller domain-focused units.",
          ruleCode: "ai.readability.documentation-hotspot",
          metadata: {
            source: "placeholder-ai",
          },
        });
      }

      if (/setTimeout\s*\(.+,\s*0\s*\)/.test(file.content)) {
        issues.push({
          title: "Deferred logic may hide sequencing issues",
          description: "Zero-delay timers can create brittle control flow and make production race conditions harder to reason about.",
          severity: "medium",
          category: "bug",
          filePath: file.path,
          lineNumber: 1,
          recommendation: "Review whether this logic should be explicit async orchestration instead of timer-based scheduling.",
          ruleCode: "ai.behavior.deferred-sequencing",
          metadata: {
            source: "placeholder-ai",
          },
        });
      }
    }

    return issues;
  }
}

