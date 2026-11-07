import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { invitations } from "./invitation";

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    action: text("action").notNull(),
    outcome: text("outcome").notNull(),
    actorUserId: text("actor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    invitationId: uuid("invitation_id").references(() => invitations.id, {
      onDelete: "set null",
    }),
    detail: jsonb("detail")
      .$type<Record<string, string | number | boolean>>()
      .default({})
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check("audit_events_action_format", sql`${table.action} ~ '^[a-z][a-z0-9_.]{2,63}$'`),
    check(
      "audit_events_outcome_allowed",
      sql`${table.outcome} in ('success', 'rejected', 'rate_limited')`,
    ),
    check("audit_events_detail_size", sql`pg_column_size(${table.detail}) <= 2048`),
    index("audit_events_created_at_idx").on(table.createdAt),
    index("audit_events_actor_user_id_idx").on(table.actorUserId),
    index("audit_events_invitation_id_idx").on(table.invitationId),
  ],
);

export const rateLimitCounters = pgTable(
  "rate_limit_counters",
  {
    key: text("key").primaryKey(),
    windowStartedAt: timestamp("window_started_at", { withTimezone: true }).notNull(),
    count: integer("count").default(0).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    check("rate_limit_counters_count_non_negative", sql`${table.count} >= 0`),
    check(
      "rate_limit_counters_window_order",
      sql`${table.expiresAt} > ${table.windowStartedAt}`,
    ),
    index("rate_limit_counters_expires_at_idx").on(table.expiresAt),
  ],
);
