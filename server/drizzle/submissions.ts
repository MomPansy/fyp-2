import { pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { studentAssessments } from "./student_assessments.ts";

export const submissions = pgTable("submissions", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  createdAt: timestamp("created_at", { precision: 3, withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date()),
  archivedAt: timestamp("archived_at", { precision: 3, withTimezone: true }),
  studentAssessment: uuid("student_assessment_id")
    .notNull()
    .references(() => studentAssessments.id, { onDelete: "cascade" }),
});

export const submissionsRelations = relations(submissions, ({ one }) => ({
  studentAssessment: one(studentAssessments, {
    fields: [submissions.studentAssessment],
    references: [studentAssessments.id],
  }),
}));
