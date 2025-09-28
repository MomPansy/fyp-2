import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { assessmentProblems } from "./assessment_problems.ts";

export const problems = pgTable("problems", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  answer: text("answer"),
  createdAt: timestamp("created_at", { precision: 3, withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date()),
  archived_at: timestamp("archived_at", { precision: 3, withTimezone: true }),
});

export const problemsRelations = relations(problems, ({ many }) => ({
  assessmentProblems: many(assessmentProblems),
}));
