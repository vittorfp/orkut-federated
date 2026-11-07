import { and, eq, gt, isNull, lt, sql } from "drizzle-orm";
import { getDatabase } from "@/db/client";
import { invitations } from "@/db/schema";

/**
 * Operator-only break-glass revocation. Returns the number of invitations that
 * were open and are now closed. Pass `inviterUserId` to scope the operation to
 * one account; omit it for the documented global incident procedure.
 */
export async function revokeActiveInvitations(
  options: { inviterUserId?: string } = {},
): Promise<number> {
  const conditions = [
    isNull(invitations.revokedAt),
    gt(invitations.expiresAt, sql`now()`),
    lt(invitations.useCount, invitations.maxUses),
  ];
  if (options.inviterUserId) {
    conditions.push(eq(invitations.inviterUserId, options.inviterUserId));
  }

  const revoked = await getDatabase()
    .update(invitations)
    .set({ revokedAt: sql`now()` })
    .where(and(...conditions))
    .returning({ id: invitations.id });

  return revoked.length;
}
