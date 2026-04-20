import type {
  AuthMeResponse,
  AuthResponse,
  BulkUpdateIssuesRequest,
  BulkUpdateIssuesResponse,
  CreateRepositoryRequest,
  DashboardSummaryResponse,
  GithubInstallation,
  GithubInstallationRepository,
  ImportGithubRepositoryResponse,
  Issue,
  IssueActivity,
  IssueFilters,
  Repository,
  RepositoryDetailResponse,
  Scan,
  ScanDetailResponse,
  UpdateIssueStatusResponse,
  UpdateIssueTriageRequest,
  UpdateIssueTriageResponse,
  UpdateRepositoryRequest,
} from "@ai-review/shared";
import { sessionStorageService } from "./storage";

const API_URL = import.meta.env.VITE_API_URL;
if (!API_URL) {
  throw new Error("VITE_API_URL is not configured");
}

const defaultRequestTimeoutMs = 8_000;
const monitoredPaths = new Set(["/auth/me", "/dashboard/summary"]);

export class ApiRequestError extends Error {
  status?: number;
  isTimeout?: boolean;

  constructor(message: string, options: { status?: number; isTimeout?: boolean } = {}) {
    super(message);
    this.name = "ApiRequestError";
    this.status = options.status;
    this.isTimeout = options.isTimeout;
  }
}

type RequestOptions = RequestInit & {
  authenticated?: boolean;
  timeoutMs?: number;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (options.authenticated) {
    const session = sessionStorageService.get();
    if (session?.accessToken) {
      headers.set("Authorization", `Bearer ${session.accessToken}`);
    }
  }

  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? defaultRequestTimeoutMs;
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  const url = `${API_URL}${path}`;

  if (monitoredPaths.has(path)) {
    console.info(`[apiClient] ${path} request start`, { apiBaseUrl: API_URL, url, timeoutMs });
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });
  } catch (error) {
    window.clearTimeout(timeoutId);

    if (monitoredPaths.has(path)) {
      console.error(`[apiClient] ${path} request failed`, {
        apiBaseUrl: API_URL,
        url,
        error: error instanceof Error ? error.message : "Unknown fetch error",
        timedOut: error instanceof DOMException && error.name === "AbortError",
      });
    }

    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiRequestError(`Request timed out after ${timeoutMs}ms`, { isTimeout: true });
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }

  if (monitoredPaths.has(path)) {
    console.info(`[apiClient] ${path} response`, { apiBaseUrl: API_URL, url, status: response.status, ok: response.ok });
  }

  if (response.status === 401 && options.authenticated) {
    sessionStorageService.clear();
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => ({ message: "Request failed" }))) as { message?: string };
    throw new ApiRequestError(body.message ?? "Request failed", { status: response.status });
  }

  return response.json() as Promise<T>;
}

const withQuery = (path: string, params?: Record<string, string | undefined>) => {
  if (!params) {
    return path;
  }

  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) {
      searchParams.set(key, value);
    }
  }

  const query = searchParams.toString();
  return query ? `${path}?${query}` : path;
};

export const apiClient = {
  signup(payload: { email: string; password: string; fullName: string }) {
    return request<AuthResponse>("/auth/signup", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  login(payload: { email: string; password: string }) {
    return request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  getMe() {
    return request<AuthMeResponse>("/auth/me", {
      authenticated: true,
    });
  },
  logout() {
    return request<{ success: boolean }>("/auth/logout", {
      method: "POST",
      authenticated: true,
    });
  },
  getDashboardSummary() {
    return request<DashboardSummaryResponse>("/dashboard/summary", {
      authenticated: true,
    });
  },
  getGithubAppInstallUrl() {
    return request<{ url: string }>("/github/app/install-url", {
      authenticated: true,
    });
  },
  getGithubInstallations() {
    return request<{ installations: GithubInstallation[] }>("/github/installations", {
      authenticated: true,
    });
  },
  getGithubInstallationRepositories(installationId: number) {
    return request<{ repositories: GithubInstallationRepository[] }>(`/github/installations/${installationId}/repositories`, {
      authenticated: true,
    });
  },
  getRepositories() {
    return request<{ repositories: Repository[] }>("/repositories", {
      authenticated: true,
    });
  },
  createRepository(payload: CreateRepositoryRequest) {
    return request<{ repository: Repository }>("/repositories", {
      method: "POST",
      authenticated: true,
      body: JSON.stringify(payload),
    });
  },
  importGithubRepository(githubUrl: string) {
    return request<ImportGithubRepositoryResponse>("/repositories/import/github", {
      method: "POST",
      authenticated: true,
      body: JSON.stringify({ githubUrl }),
    });
  },
  updateRepository(id: string, payload: UpdateRepositoryRequest) {
    return request<{ repository: Repository }>(`/repositories/${id}`, {
      method: "PATCH",
      authenticated: true,
      body: JSON.stringify(payload),
    });
  },
  deleteRepository(id: string) {
    return request<{ success: boolean }>(`/repositories/${id}`, {
      method: "DELETE",
      authenticated: true,
    });
  },
  getRepository(id: string) {
    return request<RepositoryDetailResponse>(`/repositories/${id}`, {
      authenticated: true,
    });
  },
  triggerScan(repositoryId: string) {
    return request<{ scan: Scan }>(`/repositories/${repositoryId}/scan`, {
      method: "POST",
      authenticated: true,
    });
  },
  getScans() {
    return request<{ scans: Scan[] }>("/scans", {
      authenticated: true,
    });
  },
  getScan(id: string) {
    return request<ScanDetailResponse>(`/scans/${id}`, {
      authenticated: true,
    });
  },
  getIssuesByScan(id: string, filters: IssueFilters = {}) {
    return request<{ issues: Issue[] }>(
      withQuery(`/issues/scan/${id}`, {
        severity: filters.severity,
        category: filters.category,
        status: filters.status,
      }),
      {
        authenticated: true,
      },
    );
  },
  updateIssueStatus(id: string, status: Issue["status"]) {
    return request<UpdateIssueStatusResponse>(`/issues/${id}/status`, {
      method: "PATCH",
      authenticated: true,
      body: JSON.stringify({ status }),
    });
  },
  updateIssueTriage(id: string, payload: UpdateIssueTriageRequest) {
    return request<UpdateIssueTriageResponse>(`/issues/${id}/triage`, {
      method: "PATCH",
      authenticated: true,
      body: JSON.stringify(payload),
    });
  },
  bulkUpdateIssues(payload: BulkUpdateIssuesRequest) {
    return request<BulkUpdateIssuesResponse>("/issues/bulk", {
      method: "PATCH",
      authenticated: true,
      body: JSON.stringify(payload),
    });
  },
  getIssueActivity(id: string) {
    return request<{ activity: IssueActivity[] }>(`/issues/${id}/activity`, {
      authenticated: true,
    });
  },
};
