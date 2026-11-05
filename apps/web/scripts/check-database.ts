import { closeDatabase, getSqlClient } from "../src/db/client";

try {
  await getSqlClient()`select 1`;
  process.stdout.write("database connection: ok\n");
} finally {
  await closeDatabase();
}
