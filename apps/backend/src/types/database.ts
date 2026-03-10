import type { Issue, ScanContext, ScanSummary, IssueCategory, IssueSeverity, IssueStatus, SampleFile, ScanStatus } from "@ai-review/shared";

export interface ProfileRow {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface RepositoryRow {
  id: string;
  user_id: string;
  name: string;
  owner: string;
  branch: string;
  github_url: string;
  github_installation_id: number | null;
  github_repository_id: number | null;
  access_token_hint: string | null;
  description: string | null;
  sample_files: SampleFile[];
  last_scan_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScanRow {
  id: string;
  repository_id: string;
  triggered_by: string;
  status: ScanStatus;
  scan_context: Partial<ScanContext> | null;
  attempt_count: number;
  max_attempts: number;
  next_retry_at: string | null;
  last_error_at: string | null;
  last_error_details: Record<string, unknown>;
  github_check_run_id: number | null;
  summary: Partial<ScanSummary>;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface IssueRow {
  id: string;
  scan_id: string;
  repository_id: string;
  severity: IssueSeverity;
  category: IssueCategory;
  status: IssueStatus;
  title: string;
  description: string;
  recommendation: string;
  file_path: string | null;
  line_number: number | null;
  rule_code: string | null;
  metadata: Issue["metadata"];
  created_at: string;
}

export interface ScanEventRow {
  id: string;
  scan_id: string;
  level: "info" | "warn" | "error";
  stage: string;
  message: string;
  metadata: Record<string, unknown>;
  created_at: string;
}
