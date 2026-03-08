import type { IssueCategory, IssueSeverity, IssueStatus } from "./enums";
import type { DashboardSummary, Issue, Profile, Repository, SampleFile, Scan } from "./scan";

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
}

export interface CreateRepositoryRequest {
  name: string;
  owner: string;
  branch: string;
  githubUrl: string;
  accessTokenHint?: string;
  description?: string;
  sampleFiles?: SampleFile[];
}

export interface UpdateRepositoryRequest extends Partial<CreateRepositoryRequest> {}

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
}

export interface IssueFilters {
  severity?: IssueSeverity;
  category?: IssueCategory;
  status?: IssueStatus;
}

export interface DashboardSummaryResponse {
  summary: DashboardSummary;
}
