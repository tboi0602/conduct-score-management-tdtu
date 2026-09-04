import "dotenv/config";
import { logger } from "../config/logger";
import { rabbitClient } from "../config/rabbitmq";

async function bootstrap(): Promise<void> {
  await rabbitClient.connect();
  logger.info("[worker] producer bootstrap - ready to publish events");
}

bootstrap().catch((err) => {
  logger.error(`bootstrap failed: ${(err as Error).message}`);
  process.exit(1);
});