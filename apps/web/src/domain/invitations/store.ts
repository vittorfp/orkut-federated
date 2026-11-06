import { and, eq, gt, isNull, lt, sql } from "drizzle-orm";
import { getDatabase } from "@/db/client";
import { invitations, members } from "@/db/schema";

export type InvitationRecord = {
  id: string;
  inviterUserId: string;
  maxUses: number;
  useCount: number;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
};

export type NewInvitation = {
  codeDigest: string;
  inviterUserId: string;
  maxUses: number;
  expiresAt: Date;
};

export interface InvitationStore {
  insertForActiveInviter(invitation: NewInvitation): Promise<InvitationRecord | null>;
  findByDigest(codeDigest: string): Promise<InvitationRecord | null>;
  revokeOwned(input: { invitationId: string; inviterUserId: string }): Promise<boolean>;
}

type Database = ReturnType<typeof getDatabase>;

export function createDrizzleInvitationStore(
  database: Database = getDatabase(),
): InvitationStore {
  return {
    async insertForActiveInviter(invitation) {
      return database.transaction(async (transaction) => {
        const [member] = await transaction
          .select({ status: members.status })
          .from(members)
          .where(eq(members.userId, invitation.inviterUserId))
          .for("update")
          .limit(1);
        if (member?.status !== "active") return null;

        const [created] = await transaction
          .insert(invitations)
          .values(invitation)
          .returning({
            id: invitations.id,
            inviterUserId: invitations.inviterUserId,
            maxUses: invitations.maxUses,
            useCount: invitations.useCount,
            expiresAt: invitations.expiresAt,
            revokedAt: invitations.revokedAt,
            createdAt: invitations.createdAt,
          });
        if (!created) throw new Error("invitation insert returned no record");
        return created;
      });
    },

    async findByDigest(codeDigest) {
      const [invitation] = await database
        .select({
          id: invitations.id,
          inviterUserId: invitations.inviterUserId,
          maxUses: invitations.maxUses,
          useCount: invitations.useCount,
          expiresAt: invitations.expiresAt,
          revokedAt: invitations.revokedAt,
          createdAt: invitations.createdAt,
        })
        .from(invitations)
        .where(eq(invitations.codeDigest, codeDigest))
        .limit(1);
      return invitation ?? null;
    },

    async revokeOwned({ invitationId, inviterUserId }) {
      return database.transaction(async (transaction) => {
        const [member] = await transaction
          .select({ status: members.status })
          .from(members)
          .where(eq(members.userId, inviterUserId))
          .for("update")
          .limit(1);
        if (member?.status !== "active") return false;

        const [revoked] = await transaction
          .update(invitations)
          .set({ revokedAt: sql`now()` })
          .where(
            and(
              eq(invitations.id, invitationId),
              eq(invitations.inviterUserId, inviterUserId),
              isNull(invitations.revokedAt),
              gt(invitations.expiresAt, sql`now()`),
              lt(invitations.useCount, invitations.maxUses),
            ),
          )
          .returning({ id: invitations.id });
        return Boolean(revoked);
      });
    },
  };
}
