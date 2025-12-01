import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { submissions } from "./submissions.js";
import { assessmentProblems } from "./assessment_problems.js";
import { citext, dialects } from "./_custom.js";
const submissionDetails = pgTable("submission_details", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  submissionId: uuid("submission_id").notNull().references(() => submissions.id, { onDelete: "cascade" }),
  assessmentProblemId: uuid("assessment_problem_id").notNull().references(() => assessmentProblems.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { precision: 3, withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, withTimezone: true }).defaultNow().$onUpdate(() => /* @__PURE__ */ new Date()),
  archivedAt: timestamp("archived_at", { precision: 3, withTimezone: true }),
  candidateAnswer: text("candidate_answer").notNull(),
  dialect: dialects("dialect").notNull().default("postgres"),
  grade: citext("grade").notNull().default("failed")
});
const submissionDetailsRelations = relations(
  submissionDetails,
  ({ one }) => ({
    submission: one(submissions, {
      fields: [submissionDetails.submissionId],
      references: [submissions.id]
    }),
    assessmentProblem: one(assessmentProblems, {
      fields: [submissionDetails.assessmentProblemId],
      references: [assessmentProblems.id]
    })
  })
);
export {
  submissionDetails,
  submissionDetailsRelations
};
