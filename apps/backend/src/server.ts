import { app } from "./app";
//import { env } from "./config/env";
import { logger } from "./utils/logger";

const port = Number(process.env.PORT) || 4000;

app.listen(port, () => {
  logger.info(`Backend API listening on port ${port}`);
});