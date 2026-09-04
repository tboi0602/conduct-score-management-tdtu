import "dotenv/config";
import { logger } from "@config/logger";

// Entrypoint của worker (Dockerfile target `worker` -> dist/worker.js).
// Toàn bộ logic bootstrap, consume, health và shutdown nằm trong workers/.
import("@workers").catch((err) => {
  logger.error(`failed to load worker: ${(err as Error).message}`);
  process.exit(1);
});
