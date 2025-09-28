import { pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { assessments } from "./assessments.ts";
import { userProblems } from "./user_problems.ts";

export const assessmentProblems = pgTable("assessment_problems", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  createdAt: timestamp("created_at", { precision: 3, withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date()),
  archivedAt: timestamp("archived_at", { precision: 3, withTimezone: true }),
  assessment: uuid("assessment_id")
    .notNull()
    .references(() => assessments.id, { onDelete: "cascade" }),
  problem: uuid("problem_id")
    .notNull()
    .references(() => userProblems.id, {
      onDelete: "cascade",
    }),
});

export const assessmentProblemsRelations = relations(
  assessmentProblems,
  ({ one }) => ({
    assessment: one(assessments, {
      fields: [assessmentProblems.assessment],
      references: [assessments.id],
    }),
    problem: one(userProblems, {
      fields: [assessmentProblems.problem],
      references: [userProblems.id],
    }),
  }),
);
