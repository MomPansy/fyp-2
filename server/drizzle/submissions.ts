import { pgTable, timestamp, uuid, numeric } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users.ts";
import { assessments } from "./assessments.ts";

export const submissions = pgTable("submissions", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { precision: 3, withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  archivedAt: timestamp("archived_at", { precision: 3, withTimezone: true }),
  score: numeric("score").notNull(),
  assessment: uuid("assessment_id")
    .notNull()
    .references(() => assessments.id, { onDelete: "cascade" }),
});

export const submissionsRelations = relations(submissions, ({ one }) => ({
  user: one(users, {
    fields: [submissions.userId],
    references: [users.id],
  }),
  assessment: one(assessments, {
    fields: [submissions.assessment],
    references: [assessments.id],
  }),
}));
