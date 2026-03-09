import type {
  AuthMeResponse,
  AuthResponse,
  CreateRepositoryRequest,
  DashboardSummaryResponse,
  GithubInstallation,
  GithubInstallationRepository,
  ImportGithubRepositoryResponse,
  Issue,
  IssueFilters,
  Repository,
  RepositoryDetailResponse,
  Scan,
  ScanDetailResponse,
  UpdateRepositoryRequest,
} from "@ai-review/shared";
import { sessionStorageService } from "./storage";

const API_URL = import.meta.env.VITE_API_URL;
if (!API_URL) {
  throw new Error("VITE_API_URL is not configured");
}

type RequestOptions = RequestInit & {
  authenticated?: boolean;
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

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && options.authenticated) {
    sessionStorageService.clear();
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => ({ message: "Request failed" }))) as { message?: string };
    throw new Error(body.message ?? "Request failed");
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
};
