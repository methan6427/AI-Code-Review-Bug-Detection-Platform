import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import type { Repository, SampleFile, Scan } from "@ai-review/shared";
import { env } from "../../config/env";
import { GithubIntegrationService } from "../github/GithubIntegrationService";
import { logger } from "../../utils/logger";

const execFileAsync = promisify(execFile);
const ignoredDirectories = new Set([".git", "node_modules", "dist", "build", ".next", "coverage", ".turbo"]);
const maxFileSizeBytes = 256 * 1024;
const githubIntegrationService = new GithubIntegrationService();

type LoadedRepositorySource = {
  files: SampleFile[];
  sourceType: "sample_files" | "git_clone";
  changedFiles: string[];
};

export class RepositorySourceService {
  async load(repository: Repository, scan: Scan): Promise<LoadedRepositorySource> {
    const fallbackChangedFiles = normalizeChangedFiles(scan.context.changedFiles);

    if (!this.supportsGitClone(repository.githubUrl)) {
      return this.buildFallbackSource(repository, fallbackChangedFiles);
    }

    const workspaceRoot = path.join(os.tmpdir(), "ai-review-platform-scans");
    const checkoutDir = path.join(workspaceRoot, scan.id);
    await fs.mkdir(workspaceRoot, { recursive: true });
    await fs.rm(checkoutDir, { recursive: true, force: true });

    try {
      await execFileAsync("git", ["clone", "--quiet", await this.buildCloneUrl(repository, scan), checkoutDir], {
        timeout: 120_000,
        maxBuffer: 10 * 1024 * 1024,
      });

      const checkoutTarget = scan.context.commitSha ?? scan.context.branch ?? repository.branch;
      if (checkoutTarget) {
        await execFileAsync("git", ["-C", checkoutDir, "checkout", "--quiet", checkoutTarget], {
          timeout: 120_000,
          maxBuffer: 10 * 1024 * 1024,
        });
      }

      const resolvedChangedFiles = await this.resolveChangedFiles(checkoutDir, scan);
      const changedFiles = resolvedChangedFiles.length > 0 ? resolvedChangedFiles : fallbackChangedFiles;
      const files = await this.collectFiles(checkoutDir, changedFiles);

      return {
        files,
        sourceType: "git_clone",
        changedFiles,
      };
    } catch (error) {
      logger.warn("Falling back to stored sample files for scan", {
        repositoryId: repository.id,
        scanId: scan.id,
        message: error instanceof Error ? error.message : "Unknown repository source error",
      });
      return this.buildFallbackSource(repository, fallbackChangedFiles);
    } finally {
      await fs.rm(checkoutDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  private async resolveChangedFiles(checkoutDir: string, scan: Scan) {
    const baseCommitSha = scan.context.baseCommitSha;
    const commitSha = scan.context.commitSha;

    if (!baseCommitSha || !commitSha) {
      return normalizeChangedFiles(scan.context.changedFiles);
    }

    try {
      const { stdout } = await execFileAsync("git", ["-C", checkoutDir, "diff", "--name-only", baseCommitSha, commitSha], {
        timeout: 60_000,
        maxBuffer: 10 * 1024 * 1024,
      });

      return normalizeChangedFiles(stdout.split(/\r?\n/));
    } catch (error) {
      logger.warn("Unable to compute changed files from git diff", {
        scanId: scan.id,
        repositoryId: scan.repositoryId,
        message: error instanceof Error ? error.message : "Unknown git diff error",
      });
      return normalizeChangedFiles(scan.context.changedFiles);
    }
  }

  private async collectFiles(rootDir: string, changedFiles: string[]) {
    const filter = new Set(normalizeChangedFiles(changedFiles));
    const files: SampleFile[] = [];

    await this.walkDirectory(rootDir, rootDir, files, filter);

    if (filter.size > 0 && files.length === 0) {
      logger.warn("Changed-file scan context produced no readable files", {
        rootDir,
        changedFiles: [...filter],
      });
    }

    return files;
  }

  private async walkDirectory(rootDir: string, currentDir: string, files: SampleFile[], filter: Set<string>) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const absolutePath = path.join(currentDir, entry.name);
      const relativePath = normalizeRelativePath(path.relative(rootDir, absolutePath));

      if (entry.isDirectory()) {
        if (!ignoredDirectories.has(entry.name)) {
          await this.walkDirectory(rootDir, absolutePath, files, filter);
        }
        continue;
      }

      if (filter.size > 0 && !filter.has(relativePath)) {
        continue;
      }

      const stat = await fs.stat(absolutePath);
      if (stat.size > maxFileSizeBytes) {
        continue;
      }

      const buffer = await fs.readFile(absolutePath);
      if (isBinaryBuffer(buffer)) {
        continue;
      }

      files.push({
        path: relativePath,
        content: buffer.toString("utf8"),
      });
    }
  }

  private buildFallbackSource(repository: Repository, changedFiles: string[]): LoadedRepositorySource {
    const filter = new Set(normalizeChangedFiles(changedFiles));

    if (filter.size === 0) {
      return {
        files: repository.sampleFiles,
        sourceType: "sample_files",
        changedFiles: [],
      };
    }

    const filteredFiles = repository.sampleFiles.filter((file) => filter.has(normalizeRelativePath(file.path)));

    if (filteredFiles.length === 0) {
      logger.warn("Changed-file filter excluded all sample files", {
        repositoryId: repository.id,
        changedFiles: [...filter],
      });
    }

    return {
      files: filteredFiles,
      sourceType: "sample_files",
      changedFiles: [...filter],
    };
  }

  private supportsGitClone(githubUrl: string) {
    return githubUrl.startsWith("https://") || githubUrl.startsWith("http://") || githubUrl.startsWith("git@");
  }

  private async buildCloneUrl(repository: Repository, scan: Scan) {
    const installationId = scan.context.installationId ?? repository.githubInstallationId;
    if (installationId) {
      try {
        const accessToken = await githubIntegrationService.createInstallationAccessToken(installationId);
        const url = new URL(repository.githubUrl);
        if (url.hostname === "github.com" || url.hostname === "www.github.com") {
          return `https://x-access-token:${encodeURIComponent(accessToken)}@github.com${url.pathname.replace(/\/$/, "")}.git`;
        }
      } catch (error) {
        logger.warn("Unable to create installation token for git clone", {
          repositoryId: repository.id,
          installationId,
          message: error instanceof Error ? error.message : "Unknown installation token error",
        });
      }
    }

    try {
      const url = new URL(repository.githubUrl);
      if ((url.hostname === "github.com" || url.hostname === "www.github.com") && env.GITHUB_TOKEN) {
        return `https://x-access-token:${encodeURIComponent(env.GITHUB_TOKEN)}@github.com${url.pathname.replace(/\/$/, "")}.git`;
      }
    } catch {
      return repository.githubUrl;
    }

    return repository.githubUrl.endsWith(".git") ? repository.githubUrl : `${repository.githubUrl.replace(/\/$/, "")}.git`;
  }
}

const normalizeRelativePath = (value: string) => value.replace(/\\/g, "/");

const normalizeChangedFiles = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map(normalizeRelativePath))].sort();
};

const isBinaryBuffer = (buffer: Buffer) => {
  const sample = buffer.subarray(0, 1024);
  return sample.includes(0);
};
