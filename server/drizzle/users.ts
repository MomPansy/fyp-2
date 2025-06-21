import { sql, relations } from "drizzle-orm";
import {
  pgTable,
  timestamp,
  text,
  uuid,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id")
    .primaryKey()
    .notNull(),
  authUserId: uuid("auth_user_id").notNull(),
  workspaceId: text("workspace_id").notNull(),
  createdAt: timestamp("created_at", { precision: 3, withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  archivedAt: timestamp("archived_at", { precision: 3, withTimezone: true }),
  name: text("name"),
  email: text("email"),
  phone: text("phone"),
  avatarUrl: text("avatar_url"),
});

export const userRelations = relations(users, ({ one, many }) => ({}));
