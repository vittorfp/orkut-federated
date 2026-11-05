import { migrate } from "drizzle-orm/postgres-js/migrator";
import { closeDatabase, getDatabase } from "../src/db/client";

try {
  await migrate(getDatabase(), { migrationsFolder: "drizzle" });
  process.stdout.write("database migrations: complete\n");
} finally {
  await closeDatabase();
}
