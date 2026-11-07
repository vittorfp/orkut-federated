import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { readServerEnvironment } from "@/lib/env";
import * as schema from "./schema";

let sqlClient: ReturnType<typeof postgres> | undefined;

export function getSqlClient(): ReturnType<typeof postgres> {
  sqlClient ??= postgres(readServerEnvironment().DATABASE_URL, {
    max: 10,
    prepare: false,
  });
  return sqlClient;
}

export function getDatabase() {
  return drizzle(getSqlClient(), { schema });
}

export async function closeDatabase(): Promise<void> {
  if (!sqlClient) return;
  await sqlClient.end({ timeout: 5 });
  sqlClient = undefined;
}
