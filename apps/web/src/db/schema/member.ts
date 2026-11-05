import { relations, sql } from "drizzle-orm";
import {
  check,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { users } from "./auth";

export const memberStatus = pgEnum("member_status", ["active", "suspended", "deleted"]);

export const members = pgTable("members", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  status: memberStatus("status").default("active").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const profiles = pgTable(
  "profiles",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => members.userId, { onDelete: "cascade" }),
    handle: text("handle").notNull(),
    publicName: text("public_name").notNull(),
    bio: text("bio").default("").notNull(),
    location: text("location"),
    interests: text("interests").array().default(sql`ARRAY[]::text[]`).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("profiles_handle_unique").on(table.handle),
    check("profiles_handle_normalized", sql`${table.handle} = lower(${table.handle})`),
    check(
      "profiles_handle_format",
      sql`${table.handle} ~ '^[A-Za-z][A-Za-z0-9_]{2,29}$'`,
    ),
    check(
      "profiles_public_name_length",
      sql`char_length(${table.publicName}) between 1 and 100`,
    ),
    check("profiles_bio_length", sql`char_length(${table.bio}) <= 1000`),
    check("profiles_location_length", sql`char_length(${table.location}) <= 100`),
    check("profiles_interests_limit", sql`cardinality(${table.interests}) <= 20`),
  ],
);

export const membersRelations = relations(members, ({ one }) => ({
  profile: one(profiles),
  user: one(users, {
    fields: [members.userId],
    references: [users.id],
  }),
}));

export const profilesRelations = relations(profiles, ({ one }) => ({
  member: one(members, {
    fields: [profiles.userId],
    references: [members.userId],
  }),
}));
