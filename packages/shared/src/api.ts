import type { IssueCategory, IssueSeverity, IssueStatus } from "./enums";
import type { DashboardSummary, Issue, Profile, Repository, SampleFile, Scan, ScanEvent } from "./scan";

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    fullName: string | null;
  };
  session: {
    accessToken: string;
    refreshToken: string;
    expiresAt: number | null;
  };
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest extends LoginRequest {
  fullName: string;
}

export interface AuthMeResponse {
  profile: Profile;
  authProviders: string[];
  githubConnected: boolean;
}

export interface CreateRepositoryRequest {
  name: string;
  owner: string;
  branch: string;
  githubUrl: string;
  githubInstallationId?: number;
  githubRepositoryId?: number;
  accessTokenHint?: string;
  description?: string;
  sampleFiles?: SampleFile[];
}

export interface UpdateRepositoryRequest extends Partial<CreateRepositoryRequest> {}

export interface ImportGithubRepositoryRequest {
  githubUrl: string;
}

export interface ImportedGithubRepository {
  name: string;
  owner: string;
  branch: string;
  githubUrl: string;
  githubInstallationId: number | null;
  githubRepositoryId: number | null;
  description: string | null;
}

export interface ImportGithubRepositoryResponse {
  repository: ImportedGithubRepository;
}

export interface GithubInstallation {
  id: number;
  accountLogin: string;
  accountType: string;
  repositorySelection: string;
  appSlug: string | null;
  targetType: string | null;
}

export interface GithubInstallationRepository {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  defaultBranch: string;
  htmlUrl: string;
  description: string | null;
  isPrivate: boolean;
  installationId: number;
}

export interface CreateScanResponse {
  scan: Scan;
}

export interface RepositoryDetailResponse {
  repository: Repository;
  scans: Scan[];
}

export interface ScanDetailResponse {
  scan: Scan;
  repository: Repository;
  issues: Issue[];
  events: ScanEvent[];
}

export interface IssueFilters {
  severity?: IssueSeverity;
  category?: IssueCategory;
  status?: IssueStatus;
}

export interface UpdateIssueStatusRequest {
  status: IssueStatus;
}

export interface UpdateIssueStatusResponse {
  issue: Issue;
}

export interface DashboardSummaryResponse {
  summary: DashboardSummary;
}
