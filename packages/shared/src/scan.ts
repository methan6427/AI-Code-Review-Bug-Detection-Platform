import type { IssueCategory, IssueSeverity, IssueStatus, ScanStatus } from "./enums";

export interface SampleFile {
  path: string;
  content: string;
}

export interface Profile {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Repository {
  id: string;
  userId: string;
  name: string;
  owner: string;
  branch: string;
  githubUrl: string;
  githubInstallationId: number | null;
  githubRepositoryId: number | null;
  accessTokenHint: string | null;
  description: string | null;
  sampleFiles: SampleFile[];
  lastScanAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScanSummary {
  totalIssues: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  infoCount: number;
  categories: Record<IssueCategory, number>;
}

export interface ScanContext {
  source: "manual" | "github_push" | "github_pull_request";
  branch: string | null;
  commitSha: string | null;
  baseBranch: string | null;
  baseCommitSha: string | null;
  installationId: number | null;
  pullRequestNumber: number | null;
  changedFiles: string[];
  sourceType: "sample_files" | "git_clone" | null;
}

export interface Scan {
  id: string;
  repositoryId: string;
  triggeredBy: string;
  status: ScanStatus;
  context: ScanContext;
  attemptCount: number;
  maxAttempts: number;
  nextRetryAt: string | null;
  lastErrorAt: string | null;
  summary: Partial<ScanSummary>;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScanEvent {
  id: string;
  scanId: string;
  level: "info" | "warn" | "error";
  stage: string;
  message: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface Issue {
  id: string;
  scanId: string;
  repositoryId: string;
  severity: IssueSeverity;
  category: IssueCategory;
  status: IssueStatus;
  title: string;
  description: string;
  recommendation: string;
  filePath: string | null;
  lineNumber: number | null;
  ruleCode: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface DashboardSummary {
  profile: Profile;
  metrics: {
    repositoryCount: number;
    scanCount: number;
    openIssueCount: number;
    criticalIssueCount: number;
  };
  issueCountsBySeverity: Record<IssueSeverity, number>;
  recentScans: Array<Scan & { repositoryName: string; repositoryOwner: string }>;
  repositories: Repository[];
}
