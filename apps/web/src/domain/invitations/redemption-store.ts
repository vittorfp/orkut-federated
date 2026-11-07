import { and, eq, sql } from "drizzle-orm";
import { getDatabase } from "@/db/client";
import { invitationRedemptions, invitations, members, profiles } from "@/db/schema";
import {
  createCredentialPrincipal,
  PrincipalEmailConflictError,
} from "@/lib/auth-transaction";

export type NewInvitationRedemption = {
  codeDigest: string;
  email: string;
  handle: string;
  password: string;
  publicName: string;
};

export type RedemptionResult =
  | { ok: true; userId: string }
  | {
      ok: false;
      reason: "email_conflict" | "handle_conflict" | "invitation_unavailable";
    };

export interface RedemptionStore {
  redeem(input: NewInvitationRedemption): Promise<RedemptionResult>;
}

type Database = ReturnType<typeof getDatabase>;

function constraintName(error: unknown): string | undefined {
  let current = error;
  for (let depth = 0; depth < 5 && current; depth += 1) {
    const name = (current as { constraint_name?: string }).constraint_name;
    if (name) return name;
    current = (current as { cause?: unknown }).cause;
  }
  return undefined;
}

export function createDrizzleRedemptionStore(
  database: Database = getDatabase(),
): RedemptionStore {
  return {
    async redeem(input) {
      try {
        return await database.transaction(async (transaction) => {
          const [invitation] = await transaction
            .select({
              available: sql<boolean>`${invitations.revokedAt} is null
                and ${invitations.expiresAt} > now()
                and ${invitations.useCount} < ${invitations.maxUses}`,
              id: invitations.id,
            })
            .from(invitations)
            .where(eq(invitations.codeDigest, input.codeDigest))
            .for("update")
            .limit(1);
          if (!invitation?.available) {
            return { ok: false, reason: "invitation_unavailable" } as const;
          }

          const principal = await createCredentialPrincipal(transaction, {
            email: input.email,
            name: input.publicName,
            password: input.password,
          });

          await transaction.insert(members).values({ userId: principal.id });
          await transaction.insert(profiles).values({
            handle: input.handle,
            publicName: input.publicName,
            userId: principal.id,
          });
          await transaction.insert(invitationRedemptions).values({
            invitationId: invitation.id,
            userId: principal.id,
          });

          const [claimed] = await transaction
            .update(invitations)
            .set({ useCount: sql`${invitations.useCount} + 1` })
            .where(
              and(
                eq(invitations.id, invitation.id),
                sql`${invitations.useCount} < ${invitations.maxUses}`,
              ),
            )
            .returning({ id: invitations.id });
          if (!claimed) throw new Error("invitation use count was not claimed");

          return { ok: true, userId: principal.id } as const;
        });
      } catch (error) {
        if (error instanceof PrincipalEmailConflictError) {
          return { ok: false, reason: "email_conflict" };
        }
        const constraint = constraintName(error);
        if (constraint === "users_email_unique") {
          return { ok: false, reason: "email_conflict" };
        }
        if (constraint === "profiles_handle_unique") {
          return { ok: false, reason: "handle_conflict" };
        }
        throw error;
      }
    },
  };
}
