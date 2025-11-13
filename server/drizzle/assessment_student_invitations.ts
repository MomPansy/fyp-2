import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm/relations";
import { assessments } from "./assessments.ts";

export const assessmentStudentInvitations = pgTable(
  "assessment_student_invitations",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => assessments.id, {
        onDelete: "cascade",
      }),
    email: text("email").notNull(),
    matriculationNumber: text("matriculation_number").notNull(),
    fullName: text("full_name").notNull(),
    invitationToken: text("invitation_token").unique(),
    createdAt: timestamp("created_at", { precision: 3, withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { precision: 3, withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date()),
    archivedAt: timestamp("archived_at", { precision: 3, withTimezone: true }),
    active: boolean("active").notNull().default(false),
  },
);

export const assessmentStudentInvitationRelations = relations(
  assessmentStudentInvitations,
  ({ one }) => ({
    assessment: one(assessments, {
      fields: [assessmentStudentInvitations.assessmentId],
      references: [assessments.id],
    }),
  }),
);
