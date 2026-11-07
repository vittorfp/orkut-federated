import { getDatabase } from "@/db/client";
import { auditEvents } from "@/db/schema";
import { logger } from "@/lib/logger";

export type AuditAction =
  | "invitation.issue"
  | "invitation.redemption"
  | "invitation.revoke";

export type AuditOutcome = "success" | "rejected" | "rate_limited";

export type AuditDetailValue = string | number | boolean;

export type AuditEvent = {
  action: AuditAction;
  outcome: AuditOutcome;
  actorUserId?: string;
  invitationId?: string;
  detail?: Record<string, AuditDetailValue>;
};

export interface AuditRecorder {
  record(event: AuditEvent): Promise<void>;
}

/**
 * Writes an audit event without letting a telemetry failure break the user
 * action. The failure is logged with categorical fields only.
 */
export async function tryRecordAudit(
  recorder: AuditRecorder | undefined,
  event: AuditEvent,
): Promise<void> {
  if (!recorder) return;
  try {
    await recorder.record(event);
  } catch (error) {
    logger.error(
      { action: event.action, err: error, outcome: event.outcome },
      "security audit write failed",
    );
  }
}

type Database = ReturnType<typeof getDatabase>;

/**
 * Persists a security trail. Callers must pass only opaque identifiers and
 * bounded categorical detail; invitation codes, emails, passwords, password
 * hashes, session tokens, and raw request bodies never belong here.
 */
export function createDrizzleAuditRecorder(
  database: Database = getDatabase(),
): AuditRecorder {
  return {
    async record(event) {
      await database.insert(auditEvents).values({
        action: event.action,
        actorUserId: event.actorUserId ?? null,
        detail: event.detail ?? {},
        invitationId: event.invitationId ?? null,
        outcome: event.outcome,
      });
    },
  };
}
