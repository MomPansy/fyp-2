import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { submissions } from "./submissions.ts";
import { assessmentProblems } from "./assessment_problems.ts";
import { citext, dialects } from "./_custom.ts";

export const submissionDetails = pgTable("submission_details", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  submissionId: uuid("submission_id")
    .notNull()
    .references(() => submissions.id, { onDelete: "cascade" }),
  assignmentProblemId: uuid("assignment_problem_id")
    .notNull()
    .references(() => assessmentProblems.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { precision: 3, withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date()),
  archivedAt: timestamp("archived_at", { precision: 3, withTimezone: true }),
  candidateAnswer: text("candidate_answer").notNull(),
  dialect: dialects("dialect").notNull().default("postgres"),
  grade: citext("grade").notNull().default("failed"),
});

export const submissionDetailsRelations = relations(
  submissionDetails,
  ({ one }) => ({
    submission: one(submissions, {
      fields: [submissionDetails.submissionId],
      references: [submissions.id],
    }),
    assessmentProblem: one(assessmentProblems, {
      fields: [submissionDetails.assignmentProblemId],
      references: [assessmentProblems.id],
    }),
  }),
);
