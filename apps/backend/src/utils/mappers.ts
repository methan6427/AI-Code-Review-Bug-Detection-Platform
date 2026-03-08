import type { Issue, Profile, Repository, Scan } from "@ai-review/shared";
import type { IssueRow, ProfileRow, RepositoryRow, ScanRow } from "../types/database";

export const mapProfile = (row: ProfileRow): Profile => ({
  id: row.id,
  email: row.email,
  fullName: row.full_name,
  avatarUrl: row.avatar_url,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const mapRepository = (row: RepositoryRow): Repository => ({
  id: row.id,
  userId: row.user_id,
  name: row.name,
  owner: row.owner,
  branch: row.branch,
  githubUrl: row.github_url,
  accessTokenHint: row.access_token_hint,
  description: row.description,
  sampleFiles: row.sample_files,
  lastScanAt: row.last_scan_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const mapScan = (row: ScanRow): Scan => ({
  id: row.id,
  repositoryId: row.repository_id,
  triggeredBy: row.triggered_by,
  status: row.status,
  summary: row.summary,
  errorMessage: row.error_message,
  startedAt: row.started_at,
  completedAt: row.completed_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const mapIssue = (row: IssueRow): Issue => ({
  id: row.id,
  scanId: row.scan_id,
  repositoryId: row.repository_id,
  severity: row.severity,
  category: row.category,
  status: row.status,
  title: row.title,
  description: row.description,
  recommendation: row.recommendation,
  filePath: row.file_path,
  lineNumber: row.line_number,
  ruleCode: row.rule_code,
  metadata: row.metadata,
  createdAt: row.created_at,
});

