import { app } from "./app";
import { env } from "./config/env";
import { logger } from "./utils/logger";

app.listen(env.PORT, () => {
  logger.info(`Backend API listening on port ${env.PORT}`, { origins: env.APP_ORIGIN });
});
