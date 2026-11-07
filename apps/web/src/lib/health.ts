import { getSqlClient } from "@/db/client";

export type Readiness =
  | { status: "ready" }
  | { status: "unavailable"; reason: "database" };

async function queryDatabase(): Promise<void> {
  await getSqlClient()`select 1`;
}

export async function checkReadiness(
  query: () => Promise<void> = queryDatabase,
): Promise<Readiness> {
  try {
    await query();
    return { status: "ready" };
  } catch {
    return { status: "unavailable", reason: "database" };
  }
}
