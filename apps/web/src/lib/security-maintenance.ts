import { lt } from "drizzle-orm";
import { getDatabase } from "@/db/client";
import { auditEvents, rateLimitCounters } from "@/db/schema";

export const DEFAULT_AUDIT_RETENTION_DAYS = 180;
const DAY_MS = 24 * 60 * 60 * 1000;

export type PruneResult = {
  auditEvents: number;
  rateLimitCounters: number;
};

/**
 * Removes expired rate-limit windows and audit events older than the retention
 * policy. Safe to run repeatedly; wire it to a daily operator job.
 */
export async function pruneSecurityData({
  auditRetentionDays = DEFAULT_AUDIT_RETENTION_DAYS,
  now = new Date(),
}: {
  auditRetentionDays?: number;
  now?: Date;
} = {}): Promise<PruneResult> {
  if (!Number.isFinite(auditRetentionDays) || auditRetentionDays < 1) {
    throw new Error("auditRetentionDays must be a positive number");
  }

  const cutoff = new Date(now.getTime() - auditRetentionDays * DAY_MS);
  const database = getDatabase();
  const [audits, counters] = await Promise.all([
    database
      .delete(auditEvents)
      .where(lt(auditEvents.createdAt, cutoff))
      .returning({ id: auditEvents.id }),
    database
      .delete(rateLimitCounters)
      .where(lt(rateLimitCounters.expiresAt, now))
      .returning({ key: rateLimitCounters.key }),
  ]);

  return {
    auditEvents: audits.length,
    rateLimitCounters: counters.length,
  };
}
