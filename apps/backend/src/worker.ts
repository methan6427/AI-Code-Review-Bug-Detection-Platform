import { ScanWorker } from "./modules/scans/scan-worker";
import { logger } from "./utils/logger";

const worker = new ScanWorker();

const shutdown = () => {
  logger.info("Stopping scan worker");
  worker.stop();
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

void worker.start().catch((error) => {
  logger.error("Scan worker exited with error", {
    message: error instanceof Error ? error.message : "Unknown worker startup error",
  });
  process.exit(1);
});
