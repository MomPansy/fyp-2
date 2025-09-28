import { pgTable, timestamp, uuid, numeric, text } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users.ts";
import { assessmentProblems } from "./assessment_problems.ts";

export const assessments = pgTable("assessments", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { precision: 3, withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date()),
  archivedAt: timestamp("archived_at", { precision: 3, withTimezone: true }),
  duration: numeric("duration").notNull(),
  name: text("name").notNull(),
});

export const assessmentsRelations = relations(assessments, ({ one, many }) => ({
  user: one(users, {
    fields: [assessments.userId],
    references: [users.id],
  }),
  assessmentProblems: many(assessmentProblems),
}));
