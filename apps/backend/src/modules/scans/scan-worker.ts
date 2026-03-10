import { env } from "../../config/env";
import { logger } from "../../utils/logger";
import { ScanExecutionService } from "./scan-execution.service";
import { ScanService } from "./scan.service";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class ScanWorker {
  private readonly scanService = new ScanService();
  private readonly scanExecutionService = new ScanExecutionService();
  private stopped = false;

  async start() {
    logger.info("Scan worker started", {
      pollIntervalMs: env.SCAN_WORKER_POLL_INTERVAL_MS,
    });

    while (!this.stopped) {
      try {
        const claimedScan = await this.scanService.claimNextQueuedScan();

        if (!claimedScan) {
          await delay(env.SCAN_WORKER_POLL_INTERVAL_MS);
          continue;
        }

        logger.info("Claimed queued scan", {
          scanId: claimedScan.id,
          repositoryId: claimedScan.repositoryId,
          source: claimedScan.context.source,
        });

        await this.scanExecutionService.execute(claimedScan.id);
      } catch (error) {
        logger.error("Scan worker loop error", {
          message: error instanceof Error ? error.message : "Unknown scan worker error",
        });
        await delay(env.SCAN_WORKER_POLL_INTERVAL_MS);
      }
    }
  }

  stop() {
    this.stopped = true;
  }
}
