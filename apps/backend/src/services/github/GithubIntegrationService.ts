import { createSign } from "node:crypto";
import type { GithubInstallation, GithubInstallationRepository } from "@ai-review/shared";
import { env } from "../../config/env";
import { badRequest } from "../../utils/http";
import { logger } from "../../utils/logger";

type GithubAppInstallationResponse = {
  id?: unknown;
  account?: {
    login?: unknown;
    type?: unknown;
  };
  repository_selection?: unknown;
  app_slug?: unknown;
  target_type?: unknown;
};

type GithubInstallationRepositoriesResponse = {
  repositories?: Array<{
    id?: unknown;
    name?: unknown;
    full_name?: unknown;
    html_url?: unknown;
    description?: unknown;
    private?: unknown;
    default_branch?: unknown;
    owner?: {
      login?: unknown;
    };
  }>;
};

type GithubCheckRunResponse = {
  id?: unknown;
};

type CreateGithubCheckRunInput = {
  installationId: number;
  owner: string;
  repository: string;
  headSha: string;
  name: string;
  summary: string;
  text?: string;
  title?: string;
  conclusion: "success" | "failure" | "neutral" | "action_required";
  externalId?: string;
  annotations?: Array<{
    path: string;
    start_line: number;
    end_line: number;
    annotation_level: "failure" | "warning" | "notice";
    message: string;
    title?: string;
    raw_details?: string;
  }>;
};

export type PullRequestReviewCommentInput = {
  installationId: number;
  owner: string;
  repository: string;
  pullNumber: number;
  commitSha: string;
  comments: Array<{
    path: string;
    line: number;
    body: string;
  }>;
};

export type PullRequestReviewCommentResult = {
  posted: number;
  skipped: number;
};

type CachedInstallationToken = {
  token: string;
  expiresAtMs: number;
};

const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;
const TOKEN_DEFAULT_TTL_MS = 60 * 60 * 1000;

export class GithubIntegrationService {
  private static installationTokenCache = new Map<number, CachedInstallationToken>();
  private static inflightTokenRequests = new Map<number, Promise<string>>();

  getAppInstallUrl() {
    if (!env.GITHUB_APP_NAME) {
      throw badRequest("GITHUB_APP_NAME is not configured");
    }

    return `https://github.com/apps/${env.GITHUB_APP_NAME}/installations/new`;
  }

  async listInstallations(): Promise<GithubInstallation[]> {
    const response = await this.githubAppRequest("/app/installations");
    const payload = (await response.json()) as GithubAppInstallationResponse[];

    return payload
      .map((installation) => {
        if (
          typeof installation.id !== "number" ||
          typeof installation.account?.login !== "string" ||
          typeof installation.account?.type !== "string" ||
          typeof installation.repository_selection !== "string"
        ) {
          return null;
        }

        return {
          id: installation.id,
          accountLogin: installation.account.login,
          accountType: installation.account.type,
          repositorySelection: installation.repository_selection,
          appSlug: typeof installation.app_slug === "string" ? installation.app_slug : null,
          targetType: typeof installation.target_type === "string" ? installation.target_type : null,
        } satisfies GithubInstallation;
      })
      .filter((installation): installation is GithubInstallation => installation !== null);
  }

  async listInstallationRepositories(installationId: number): Promise<GithubInstallationRepository[]> {
    const accessToken = await this.createInstallationAccessToken(installationId);
    const response = await fetch("https://api.github.com/installation/repositories", {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "ai-code-review-platform",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!response.ok) {
      throw badRequest("Unable to fetch repositories for the selected GitHub App installation");
    }

    const payload = (await response.json()) as GithubInstallationRepositoriesResponse;

    return (payload.repositories ?? [])
      .map((repository) => {
        if (
          typeof repository.id !== "number" ||
          typeof repository.name !== "string" ||
          typeof repository.full_name !== "string" ||
          typeof repository.html_url !== "string" ||
          typeof repository.default_branch !== "string" ||
          typeof repository.private !== "boolean" ||
          typeof repository.owner?.login !== "string"
        ) {
          return null;
        }

        return {
          id: repository.id,
          name: repository.name,
          fullName: repository.full_name,
          owner: repository.owner.login,
          defaultBranch: repository.default_branch,
          htmlUrl: repository.html_url,
          description: typeof repository.description === "string" ? repository.description : null,
          isPrivate: repository.private,
          installationId,
        } satisfies GithubInstallationRepository;
      })
      .filter((repository): repository is GithubInstallationRepository => repository !== null);
  }

  async createInstallationAccessToken(installationId: number) {
    const cached = GithubIntegrationService.installationTokenCache.get(installationId);
    if (cached && cached.expiresAtMs - TOKEN_REFRESH_BUFFER_MS > Date.now()) {
      return cached.token;
    }

    const inflight = GithubIntegrationService.inflightTokenRequests.get(installationId);
    if (inflight) {
      return inflight;
    }

    const request = this.requestInstallationAccessToken(installationId).finally(() => {
      GithubIntegrationService.inflightTokenRequests.delete(installationId);
    });
    GithubIntegrationService.inflightTokenRequests.set(installationId, request);
    return request;
  }

  invalidateInstallationToken(installationId: number) {
    GithubIntegrationService.installationTokenCache.delete(installationId);
  }

  private async requestInstallationAccessToken(installationId: number) {
    logger.info("Requesting GitHub installation access token", {
      installationId,
    });
    const response = await fetch(`https://api.github.com/app/installations/${installationId}/access_tokens`, {
      method: "POST",
      headers: this.getGithubAppHeaders(),
    });

    if (!response.ok) {
      const details = await this.readGithubErrorResponse(response);
      logger.warn("GitHub installation access token request failed", {
        installationId,
        status: response.status,
        details,
      });
      throw badRequest(`Unable to create a GitHub App installation access token (${response.status})${details ? `: ${details}` : ""}`);
    }

    const payload = (await response.json()) as { token?: unknown; expires_at?: unknown };
    if (typeof payload.token !== "string") {
      throw badRequest("GitHub App installation token response was invalid");
    }

    const expiresAtMs =
      typeof payload.expires_at === "string"
        ? Date.parse(payload.expires_at) || Date.now() + TOKEN_DEFAULT_TTL_MS
        : Date.now() + TOKEN_DEFAULT_TTL_MS;

    GithubIntegrationService.installationTokenCache.set(installationId, {
      token: payload.token,
      expiresAtMs,
    });

    return payload.token;
  }

  async createCheckRun(input: CreateGithubCheckRunInput) {
    logger.info("Creating GitHub check run", {
      installationId: input.installationId,
      owner: input.owner,
      repository: input.repository,
      headSha: input.headSha,
      conclusion: input.conclusion,
      annotationCount: input.annotations?.length ?? 0,
      externalId: input.externalId ?? null,
    });
    const accessToken = await this.createInstallationAccessToken(input.installationId);
    const response = await fetch(`https://api.github.com/repos/${input.owner}/${input.repository}/check-runs`, {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "ai-code-review-platform",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: input.name,
        head_sha: input.headSha,
        status: "completed",
        conclusion: input.conclusion,
        completed_at: new Date().toISOString(),
        external_id: input.externalId,
        output: {
          title: input.title ?? input.name,
          summary: input.summary,
          text: input.text,
          annotations: input.annotations?.slice(0, 50),
        },
      }),
    });

    if (!response.ok) {
      const details = await this.readGithubErrorResponse(response);
      logger.warn("GitHub check run creation failed", {
        installationId: input.installationId,
        owner: input.owner,
        repository: input.repository,
        headSha: input.headSha,
        status: response.status,
        details,
      });
      throw badRequest(`Unable to create a GitHub check run (${response.status})${details ? `: ${details}` : ""}`);
    }

    const payload = (await response.json()) as GithubCheckRunResponse;
    if (typeof payload.id !== "number") {
      throw badRequest("GitHub check run response was invalid");
    }

    logger.info("GitHub check run created", {
      installationId: input.installationId,
      owner: input.owner,
      repository: input.repository,
      headSha: input.headSha,
      checkRunId: payload.id,
    });

    return payload.id;
  }

  async createPullRequestReview(input: PullRequestReviewCommentInput): Promise<PullRequestReviewCommentResult> {
    if (input.comments.length === 0) {
      return { posted: 0, skipped: 0 };
    }

    const accessToken = await this.createInstallationAccessToken(input.installationId);
    const limited = input.comments.slice(0, 30);
    const skipped = input.comments.length - limited.length;

    const response = await fetch(
      `https://api.github.com/repos/${input.owner}/${input.repository}/pulls/${input.pullNumber}/reviews`,
      {
        method: "POST",
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${accessToken}`,
          "User-Agent": "ai-code-review-platform",
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          commit_id: input.commitSha,
          event: "COMMENT",
          body: `AI Review found ${input.comments.length} finding(s) on this pull request.`,
          comments: limited.map((comment) => ({
            path: comment.path,
            line: comment.line,
            side: "RIGHT",
            body: comment.body,
          })),
        }),
      },
    );

    if (!response.ok) {
      const details = await this.readGithubErrorResponse(response);
      logger.warn("GitHub PR review creation failed", {
        installationId: input.installationId,
        owner: input.owner,
        repository: input.repository,
        pullNumber: input.pullNumber,
        status: response.status,
        details,
      });
      return { posted: 0, skipped: input.comments.length };
    }

    logger.info("GitHub PR review posted", {
      installationId: input.installationId,
      owner: input.owner,
      repository: input.repository,
      pullNumber: input.pullNumber,
      posted: limited.length,
      skipped,
    });

    return { posted: limited.length, skipped };
  }

  private async githubAppRequest(path: string) {
    const response = await fetch(`https://api.github.com${path}`, {
      headers: this.getGithubAppHeaders(),
    });

    if (!response.ok) {
      throw badRequest("Unable to fetch data from the GitHub App API");
    }

    return response;
  }

  private getGithubAppHeaders() {
    return {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${this.createAppJwt()}`,
      "User-Agent": "ai-code-review-platform",
      "X-GitHub-Api-Version": "2022-11-28",
    };
  }

  private createAppJwt() {
    if (!env.GITHUB_APP_ID || !env.GITHUB_APP_PRIVATE_KEY) {
      throw badRequest("GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY are required for GitHub App operations");
    }

    const now = Math.floor(Date.now() / 1000);
    const header = this.base64UrlEncode({ alg: "RS256", typ: "JWT" });
    const payload = this.base64UrlEncode({
      iat: now - 60,
      exp: now + 9 * 60,
      iss: env.GITHUB_APP_ID,
    });

    const signer = createSign("RSA-SHA256");
    signer.update(`${header}.${payload}`);
    signer.end();

    const normalizedPrivateKey = env.GITHUB_APP_PRIVATE_KEY.replace(/\\n/g, "\n");
    const signature = signer.sign(normalizedPrivateKey, "base64url");

    return `${header}.${payload}.${signature}`;
  }

  private base64UrlEncode(value: object) {
    return Buffer.from(JSON.stringify(value)).toString("base64url");
  }

  private async readGithubErrorResponse(response: Response) {
    const text = await response.text();
    if (!text) {
      return null;
    }

    try {
      const parsed = JSON.parse(text) as { message?: unknown; errors?: unknown };
      const parts = [
        typeof parsed.message === "string" ? parsed.message : null,
        Array.isArray(parsed.errors) ? JSON.stringify(parsed.errors) : null,
      ].filter((value): value is string => Boolean(value));

      if (parts.length > 0) {
        return parts.join(" | ").slice(0, 1000);
      }
    } catch {
      return text.slice(0, 1000);
    }

    return text.slice(0, 1000);
  }
}
