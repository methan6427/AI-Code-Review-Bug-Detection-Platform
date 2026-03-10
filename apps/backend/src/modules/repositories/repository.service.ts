import type { CreateRepositoryRequest, UpdateRepositoryRequest } from "@ai-review/shared";
import { env } from "../../config/env";
import { defaultRepositoryFiles } from "../../constants/demoFiles";
import type { RepositoryRow, ScanRow } from "../../types/database";
import { mapRepository, mapScan } from "../../utils/mappers";
import { badRequest, notFound } from "../../utils/http";
import { supabaseAdmin } from "../../services/supabase/client";

export class RepositoryService {
  async importFromGithubUrl(githubUrl: string) {
    const parsed = this.parseGithubRepositoryUrl(githubUrl);
    const headers = new Headers({
      Accept: "application/vnd.github+json",
      "User-Agent": "ai-code-review-platform",
    });

    if (env.GITHUB_TOKEN) {
      headers.set("Authorization", `Bearer ${env.GITHUB_TOKEN}`);
      headers.set("X-GitHub-Api-Version", "2022-11-28");
    }

    const response = await fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.name}`, {
      headers,
    });

    if (response.status === 404) {
      throw notFound(
        env.GITHUB_TOKEN
          ? "GitHub repository not found or is not accessible with the configured token"
          : "GitHub repository not found or requires authenticated GitHub access",
      );
    }

    if (response.status === 403) {
      throw badRequest(
        env.GITHUB_TOKEN
          ? "GitHub API access was denied. Check the configured token scopes and repository access."
          : "GitHub API rate limit or access restriction hit. Configure GITHUB_TOKEN for authenticated imports.",
      );
    }

    if (!response.ok) {
      throw badRequest("Unable to import repository metadata from GitHub");
    }

    const payload = (await response.json()) as {
      name?: unknown;
      owner?: { login?: unknown };
      default_branch?: unknown;
      html_url?: unknown;
      description?: unknown;
    };

    if (
      typeof payload.name !== "string" ||
      typeof payload.owner?.login !== "string" ||
      typeof payload.default_branch !== "string" ||
      typeof payload.html_url !== "string"
    ) {
      throw badRequest("GitHub repository response was missing required metadata");
    }

    return {
      name: payload.name,
      owner: payload.owner.login,
      branch: payload.default_branch,
      githubUrl: payload.html_url,
      githubInstallationId: null,
      githubRepositoryId: null,
      description: typeof payload.description === "string" ? payload.description : null,
    };
  }

  async create(userId: string, input: CreateRepositoryRequest) {
    const payload = {
      user_id: userId,
      name: input.name,
      owner: input.owner,
      branch: input.branch,
      github_url: input.githubUrl,
      github_installation_id: input.githubInstallationId ?? null,
      github_repository_id: input.githubRepositoryId ?? null,
      access_token_hint: input.accessTokenHint ?? null,
      description: input.description ?? null,
      sample_files: input.sampleFiles?.length ? input.sampleFiles : defaultRepositoryFiles,
    };

    const { data, error } = await supabaseAdmin.from("repositories").insert(payload).select("*").single<RepositoryRow>();

    if (error || !data) {
      throw badRequest(error?.message ?? "Unable to create repository");
    }

    return mapRepository(data);
  }

  async update(userId: string, repositoryId: string, input: UpdateRepositoryRequest) {
    await this.getOwnedRepository(userId, repositoryId);

    const payload = this.buildUpdatePayload(input);

    const { data, error } = await supabaseAdmin
      .from("repositories")
      .update(payload)
      .eq("id", repositoryId)
      .eq("user_id", userId)
      .select("*")
      .single<RepositoryRow>();

    if (error || !data) {
      throw badRequest(error?.message ?? "Unable to update repository");
    }

    return mapRepository(data);
  }

  async listByUser(userId: string) {
    const { data, error } = await supabaseAdmin
      .from("repositories")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .returns<RepositoryRow[]>();

    if (error) {
      throw badRequest(error.message);
    }

    return (data ?? []).map(mapRepository);
  }

  async listOwnedRepositoryIds(userId: string) {
    const repositories = await this.listByUser(userId);
    return repositories.map((repository) => repository.id);
  }

  async findByGithubOwnerAndName(owner: string, name: string) {
    const { data, error } = await supabaseAdmin
      .from("repositories")
      .select("*")
      .eq("owner", owner)
      .eq("name", name)
      .returns<RepositoryRow[]>();

    if (error) {
      throw badRequest(error.message);
    }

    return (data ?? []).map(mapRepository);
  }

  async getOwnedRepository(userId: string, repositoryId: string) {
    const { data, error } = await supabaseAdmin
      .from("repositories")
      .select("*")
      .eq("id", repositoryId)
      .eq("user_id", userId)
      .single<RepositoryRow>();

    if (error || !data) {
      throw notFound("Repository not found");
    }

    return mapRepository(data);
  }

  async getRepositoryDetail(userId: string, repositoryId: string) {
    const repository = await this.getOwnedRepository(userId, repositoryId);
    const { data, error } = await supabaseAdmin
      .from("scans")
      .select("*")
      .eq("repository_id", repositoryId)
      .order("created_at", { ascending: false })
      .returns<ScanRow[]>();

    if (error) {
      throw badRequest(error.message);
    }

    return {
      repository,
      scans: (data ?? []).map(mapScan),
    };
  }

  async remove(userId: string, repositoryId: string) {
    await this.getOwnedRepository(userId, repositoryId);

    const { error } = await supabaseAdmin
      .from("repositories")
      .delete()
      .eq("id", repositoryId)
      .eq("user_id", userId);

    if (error) {
      throw badRequest(error.message);
    }

    return { success: true };
  }

  async markLastScan(repositoryId: string, isoTimestamp: string) {
    const { error } = await supabaseAdmin.from("repositories").update({ last_scan_at: isoTimestamp }).eq("id", repositoryId);
    if (error) {
      throw badRequest(error.message);
    }
  }

  private buildUpdatePayload(input: UpdateRepositoryRequest): Partial<RepositoryRow> {
    const payload: Partial<RepositoryRow> = {};

    if (input.name !== undefined) {
      payload.name = input.name;
    }
    if (input.owner !== undefined) {
      payload.owner = input.owner;
    }
    if (input.branch !== undefined) {
      payload.branch = input.branch;
    }
    if (input.githubUrl !== undefined) {
      payload.github_url = input.githubUrl;
    }
    if (input.githubInstallationId !== undefined) {
      payload.github_installation_id = input.githubInstallationId ?? null;
    }
    if (input.githubRepositoryId !== undefined) {
      payload.github_repository_id = input.githubRepositoryId ?? null;
    }
    if (input.accessTokenHint !== undefined) {
      payload.access_token_hint = input.accessTokenHint || null;
    }
    if (input.description !== undefined) {
      payload.description = input.description || null;
    }
    if (input.sampleFiles !== undefined) {
      payload.sample_files = input.sampleFiles.length > 0 ? input.sampleFiles : defaultRepositoryFiles;
    }

    return payload;
  }

  private parseGithubRepositoryUrl(githubUrl: string) {
    let url: URL;

    try {
      url = new URL(githubUrl);
    } catch {
      throw badRequest("GitHub URL must be a valid URL");
    }

    if (url.hostname !== "github.com" && url.hostname !== "www.github.com") {
      throw badRequest("Only github.com repository URLs are supported");
    }

    const segments = url.pathname.split("/").filter(Boolean);
    if (segments.length < 2) {
      throw badRequest("GitHub URL must include both owner and repository name");
    }

    return {
      owner: segments[0]!,
      name: segments[1]!.replace(/\.git$/i, ""),
    };
  }
}
