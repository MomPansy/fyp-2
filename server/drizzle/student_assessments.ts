import {
  pgTable,
  timestamp,
  uuid,
  pgPolicy,
  unique,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { users } from "./users.ts";
import { assessments } from "./assessments.ts";

export const studentAssessments = pgTable(
  "student_assessments",
  {
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
    student: uuid("student_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (table) => [
    unique("unique_student_assessment_datetime").on(
      table.student,
      table.assessment,
    ),
  ],
).enableRLS();

// RLS Policy: Only allow inserts/updates where the user has a "student" role
export const studentAssessmentPolicy = pgPolicy("student_role_policy", {
  as: "permissive",
  for: "all",
  to: ["public"],
  using: sql`EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = student_id 
    AND ur.role_id = 'student' 
    AND ur.archived_at IS NULL
  )`,
  withCheck: sql`EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = student_id 
    AND ur.role_id = 'student' 
    AND ur.archived_at IS NULL
  )`,
}).link(studentAssessments);

export const studentAssessmentRelations = relations(
  studentAssessments,
  ({ one }) => ({
    user: one(users, {
      fields: [studentAssessments.student],
      references: [users.id],
    }),
    assessment: one(assessments, {
      fields: [studentAssessments.assessment],
      references: [assessments.id],
    }),
  }),
);
