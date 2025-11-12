import { pgTable, timestamp, uuid, numeric, text } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users.js";
import { assessmentProblems } from "./assessment_problems.js";
const assessments = pgTable("assessments", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { precision: 3, withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, withTimezone: true }).defaultNow().$onUpdate(() => /* @__PURE__ */ new Date()),
  archivedAt: timestamp("archived_at", { precision: 3, withTimezone: true }),
  duration: numeric("duration").notNull(),
  name: text("name").notNull(),
  dateTimeScheduled: timestamp("date_time_scheduled", {
    precision: 3,
    withTimezone: true
  })
});
const assessmentsRelations = relations(assessments, ({ one, many }) => ({
  user: one(users, {
    fields: [assessments.userId],
    references: [users.id]
  }),
  assessmentProblems: many(assessmentProblems)
}));
export {
  assessments,
  assessmentsRelations
};
