import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { assessmentProblems } from "./assessment_problems.js";
import { dialects } from "./_custom.js";
const problems = pgTable("problems", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  answer: text("answer"),
  dialect: dialects("dialect").notNull().default("postgres"),
  createdAt: timestamp("created_at", { precision: 3, withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, withTimezone: true }).defaultNow().$onUpdate(() => /* @__PURE__ */ new Date()),
  archived_at: timestamp("archived_at", { precision: 3, withTimezone: true })
});
const problemsRelations = relations(problems, ({ many }) => ({
  assessmentProblems: many(assessmentProblems)
}));
export {
  problems,
  problemsRelations
};
