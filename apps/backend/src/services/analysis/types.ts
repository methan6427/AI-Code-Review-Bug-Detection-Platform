import type { IssueCategory, IssueSeverity, SampleFile, ScanSummary } from "@ai-review/shared";

export interface AnalysisIssue {
  title: string;
  description: string;
  severity: IssueSeverity;
  category: IssueCategory;
  filePath: string | null;
  lineNumber: number | null;
  recommendation: string;
  ruleCode: string;
  metadata?: Record<string, unknown>;
}

export interface AnalysisContext {
  repositoryId: string;
  files: SampleFile[];
}

export interface StaticAnalysisService {
  analyze(context: AnalysisContext): Promise<AnalysisIssue[]>;
}

export interface AIAnalysisService {
  analyze(context: AnalysisContext): Promise<AnalysisIssue[]>;
}

export interface ScanOrchestrator {
  runScan(input: { repositoryId: string; scanId: string; triggeredBy: string }): Promise<void>;
}

export interface ScanExecutionResult {
  issues: AnalysisIssue[];
  summary: ScanSummary;
}

