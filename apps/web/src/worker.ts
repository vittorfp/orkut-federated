import { closeDatabase, getSqlClient } from "@/db/client";
import { logger } from "@/lib/logger";

let shuttingDown = false;
let keepAlive: NodeJS.Timeout | undefined;

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  if (keepAlive) clearInterval(keepAlive);
  logger.info({ signal }, "worker shutting down");
  await closeDatabase();
  process.exitCode = 0;
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));

try {
  await getSqlClient()`select 1`;
  logger.info("worker started");
  keepAlive = setInterval(() => undefined, 60_000);
} catch (error) {
  logger.fatal({ error }, "worker could not connect to PostgreSQL");
  await closeDatabase();
  process.exitCode = 1;
}
