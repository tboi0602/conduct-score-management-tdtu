import "dotenv/config";
import { logger } from "./config/logger";

// Worker entrypoint (Dockerfile target `worker` -> dist/worker.js).
// All bootstrap, consume, health and shutdown logic lives in workers/.
import("./workers").catch((err) => {
  logger.error(`failed to load worker: ${(err as Error).message}`);
  process.exit(1);
});
