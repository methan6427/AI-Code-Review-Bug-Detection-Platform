import type { ScanContext } from "@ai-review/shared";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../../config/env";
import { ScanService } from "../scans/scan.service";
import { RepositoryService } from "../repositories/repository.service";
import { badRequest, unauthorized } from "../../utils/http";
import { logger } from "../../utils/logger";

export type GithubWebhookPayload = {
  action?: unknown;
  installation?: { id?: unknown };
  organization?: { login?: unknown };
  repository?: {
    id?: unknown;
    name?: unknown;
    full_name?: unknown;
    default_branch?: unknown;
    private?: unknown;
  };
  pull_request?: {
    number?: unknown;
    head?: { ref?: unknown; sha?: unknown };
    base?: { ref?: unknown; sha?: unknown };
  };
  ref?: unknown;
  before?: unknown;
  after?: unknown;
  commits?: Array<{
    added?: unknown;
    modified?: unknown;
    removed?: unknown;
  }>;
  sender?: { login?: unknown };
  zen?: unknown;
} | null;

export class GithubService {
  private readonly repositoryService = new RepositoryService();
  private readonly scanService = new ScanService();

  verifyWebhookSignature(signatureHeader: string | undefined, rawBody: Buffer) {
    if (!env.GITHUB_WEBHOOK_SECRET) {
      throw badRequest("GITHUB_WEBHOOK_SECRET is not configured");
    }

    if (!signatureHeader?.startsWith("sha256=")) {
      throw unauthorized("Missing or invalid GitHub webhook signature");
    }

    const expectedSignature = createHmac("sha256", env.GITHUB_WEBHOOK_SECRET).update(rawBody).digest("hex");
    const actualSignature = signatureHeader.slice("sha256=".length);

    const expectedBuffer = Buffer.from(expectedSignature, "utf8");
    const actualBuffer = Buffer.from(actualSignature, "utf8");

    if (expectedBuffer.length !== actualBuffer.length || !timingSafeEqual(expectedBuffer, actualBuffer)) {
      throw unauthorized("GitHub webhook signature verification failed");
    }
  }

  async processWebhookEvent(eventName: string, deliveryId: string | undefined, payload: GithubWebhookPayload) {
    const metadata = {
      deliveryId: deliveryId ?? null,
      eventName,
      action: typeof payload?.action === "string" ? payload.action : null,
      repository:
        typeof payload?.repository?.full_name === "string"
          ? payload.repository.full_name
          : typeof payload?.repository?.name === "string"
            ? payload.repository.name
            : null,
      installationId: typeof payload?.installation?.id === "number" ? payload.installation.id : null,
    };

    switch (eventName) {
      case "ping":
        logger.info("GitHub webhook ping received", {
          ...metadata,
          zen: typeof payload?.zen === "string" ? payload.zen : null,
        });
        return { accepted: true, event: eventName, action: "ping" };

      case "installation":
        logger.info("GitHub installation event received", metadata);
        return { accepted: true, event: eventName, action: metadata.action };

      case "installation_repositories":
        logger.info("GitHub installation repository scope event received", metadata);
        return { accepted: true, event: eventName, action: metadata.action };

      case "pull_request":
        await this.triggerRepositoryScansFromWebhook(payload, this.buildPullRequestScanContext(payload));
        logger.info("GitHub pull request event received", {
          ...metadata,
          pullRequestNumber: typeof payload?.pull_request?.number === "number" ? payload.pull_request.number : null,
          baseRef: typeof payload?.pull_request?.base?.ref === "string" ? payload.pull_request.base.ref : null,
          headRef: typeof payload?.pull_request?.head?.ref === "string" ? payload.pull_request.head.ref : null,
        });
        return { accepted: true, event: eventName, action: metadata.action };

      case "push":
        await this.triggerRepositoryScansFromWebhook(payload, this.buildPushScanContext(payload));
        logger.info("GitHub push event received", {
          ...metadata,
          ref: typeof payload?.ref === "string" ? payload.ref : null,
          after: typeof payload?.after === "string" ? payload.after : null,
        });
        return { accepted: true, event: eventName, action: "push" };

      default:
        logger.info("GitHub webhook event received", metadata);
        return { accepted: true, event: eventName, action: metadata.action };
    }
  }

  private async triggerRepositoryScansFromWebhook(payload: GithubWebhookPayload, scanContext: Partial<ScanContext>) {
    const owner = typeof payload?.repository?.full_name === "string" ? payload.repository.full_name.split("/")[0] : null;
    const name = typeof payload?.repository?.name === "string" ? payload.repository.name : null;
    const installationId = typeof payload?.installation?.id === "number" ? payload.installation.id : null;

    if (!owner || !name) {
      return;
    }

    const repositories = await this.repositoryService.findByGithubOwnerAndName(owner, name);
    await Promise.all(
      repositories.map(async (repository) => {
        try {
          if (installationId && repository.githubInstallationId && repository.githubInstallationId !== installationId) {
            logger.warn("GitHub webhook installation id differs from repository linkage", {
              repositoryId: repository.id,
              owner,
              name,
              repositoryInstallationId: repository.githubInstallationId,
              webhookInstallationId: installationId,
            });
          }

          await this.scanService.createScan(repository.userId, repository.id, {
            ...scanContext,
            installationId,
          });
        } catch (error) {
          logger.warn("GitHub webhook scan trigger skipped", {
            repositoryId: repository.id,
            owner,
            name,
            message: error instanceof Error ? error.message : "Unknown webhook scan trigger error",
          });
        }
      }),
    );
  }

  private buildPushScanContext(payload: GithubWebhookPayload): Partial<ScanContext> {
    const branch = this.extractBranchFromRef(typeof payload?.ref === "string" ? payload.ref : null);
    const changedFiles = new Set<string>();

    for (const commit of Array.isArray(payload?.commits) ? payload.commits : []) {
      for (const field of [commit.added, commit.modified, commit.removed]) {
        if (Array.isArray(field)) {
          for (const file of field) {
            if (typeof file === "string" && file.trim().length > 0) {
              changedFiles.add(file);
            }
          }
        }
      }
    }

    return {
      source: "github_push",
      branch,
      commitSha: typeof payload?.after === "string" ? payload.after : null,
      baseCommitSha: typeof payload?.before === "string" ? payload.before : null,
      changedFiles: [...changedFiles],
    };
  }

  private buildPullRequestScanContext(payload: GithubWebhookPayload): Partial<ScanContext> {
    return {
      source: "github_pull_request",
      branch: typeof payload?.pull_request?.head?.ref === "string" ? payload.pull_request.head.ref : null,
      commitSha: typeof payload?.pull_request?.head?.sha === "string" ? payload.pull_request.head.sha : null,
      baseBranch: typeof payload?.pull_request?.base?.ref === "string" ? payload.pull_request.base.ref : null,
      baseCommitSha: typeof payload?.pull_request?.base?.sha === "string" ? payload.pull_request.base.sha : null,
      pullRequestNumber: typeof payload?.pull_request?.number === "number" ? payload.pull_request.number : null,
    };
  }

  private extractBranchFromRef(ref: string | null) {
    if (!ref?.startsWith("refs/heads/")) {
      return null;
    }

    return ref.slice("refs/heads/".length);
  }
}
