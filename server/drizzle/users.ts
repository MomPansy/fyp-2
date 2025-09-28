import { pgTable, timestamp, text, uuid, index } from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    authUserId: uuid("auth_user_id").notNull().unique(),
    createdAt: timestamp("created_at", { precision: 3, withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { precision: 3, withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
    archivedAt: timestamp("archived_at", { precision: 3, withTimezone: true }),
    email: text("email").notNull(),
  },
  (table) => [index("users_auth_user_id_idx").on(table.authUserId)],
);
