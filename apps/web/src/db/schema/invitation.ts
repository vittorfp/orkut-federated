import { relations, sql } from "drizzle-orm";
import {
  check,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { members } from "./member";

export const invitations = pgTable(
  "invitations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    codeDigest: text("code_digest").notNull(),
    inviterUserId: text("inviter_user_id")
      .notNull()
      .references(() => members.userId, { onDelete: "restrict" }),
    maxUses: integer("max_uses").default(1).notNull(),
    useCount: integer("use_count").default(0).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("invitations_code_digest_unique").on(table.codeDigest),
    check("invitations_code_digest_format", sql`${table.codeDigest} ~ '^[0-9a-f]{64}$'`),
    check("invitations_max_uses_range", sql`${table.maxUses} between 1 and 100`),
    check(
      "invitations_use_count_range",
      sql`${table.useCount} between 0 and ${table.maxUses}`,
    ),
    check(
      "invitations_expiry_after_creation",
      sql`${table.expiresAt} > ${table.createdAt}`,
    ),
    check(
      "invitations_revocation_after_creation",
      sql`${table.revokedAt} is null or ${table.revokedAt} >= ${table.createdAt}`,
    ),
  ],
);

export const invitationRedemptions = pgTable(
  "invitation_redemptions",
  {
    invitationId: uuid("invitation_id")
      .notNull()
      .references(() => invitations.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    redeemedAt: timestamp("redeemed_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.invitationId, table.userId],
      name: "invitation_redemptions_pk",
    }),
    uniqueIndex("invitation_redemptions_user_unique").on(table.userId),
  ],
);

export const invitationsRelations = relations(invitations, ({ many, one }) => ({
  inviter: one(members, {
    fields: [invitations.inviterUserId],
    references: [members.userId],
  }),
  redemptions: many(invitationRedemptions),
}));

export const invitationRedemptionsRelations = relations(
  invitationRedemptions,
  ({ one }) => ({
    invitation: one(invitations, {
      fields: [invitationRedemptions.invitationId],
      references: [invitations.id],
    }),
    user: one(users, {
      fields: [invitationRedemptions.userId],
      references: [users.id],
    }),
  }),
);
