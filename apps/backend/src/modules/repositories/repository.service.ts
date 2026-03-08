import type { CreateRepositoryRequest, UpdateRepositoryRequest } from "@ai-review/shared";
import { defaultRepositoryFiles } from "../../constants/demoFiles";
import type { RepositoryRow, ScanRow } from "../../types/database";
import { mapRepository, mapScan } from "../../utils/mappers";
import { badRequest, notFound } from "../../utils/http";
import { supabaseAdmin } from "../../services/supabase/client";

export class RepositoryService {
  async create(userId: string, input: CreateRepositoryRequest) {
    const payload = {
      user_id: userId,
      name: input.name,
      owner: input.owner,
      branch: input.branch,
      github_url: input.githubUrl,
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
}
