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
  after?: unknown;
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
        await this.triggerRepositoryScansFromWebhook(payload);
        logger.info("GitHub pull request event received", {
          ...metadata,
          pullRequestNumber: typeof payload?.pull_request?.number === "number" ? payload.pull_request.number : null,
          baseRef: typeof payload?.pull_request?.base?.ref === "string" ? payload.pull_request.base.ref : null,
          headRef: typeof payload?.pull_request?.head?.ref === "string" ? payload.pull_request.head.ref : null,
        });
        return { accepted: true, event: eventName, action: metadata.action };

      case "push":
        await this.triggerRepositoryScansFromWebhook(payload);
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

  private async triggerRepositoryScansFromWebhook(payload: GithubWebhookPayload) {
    const owner = typeof payload?.repository?.full_name === "string" ? payload.repository.full_name.split("/")[0] : null;
    const name = typeof payload?.repository?.name === "string" ? payload.repository.name : null;

    if (!owner || !name) {
      return;
    }

    const repositories = await this.repositoryService.findByGithubOwnerAndName(owner, name);
    await Promise.all(
      repositories.map(async (repository) => {
        try {
          await this.scanService.createScan(repository.userId, repository.id);
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
}
