import { zValidator } from "@hono/zod-validator";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { eq, inArray, and, isNull } from "drizzle-orm";

import { factory } from "../../factory.ts";
import { drizzle } from "../../middlewares/drizzle.ts";
import { auth } from "../../middlewares/auth.ts";
import { assessments } from "../../drizzle/assessments.ts";
import { assessmentProblems } from "../../drizzle/assessment_problems.ts";
import { assessmentStudentInvitations } from "../../drizzle/assessment_student_invitations.ts";
import { studentAssessments } from "../../drizzle/student_assessments.ts";
import { sendCancellationEmail } from "../../lib/mailer.ts";

/**
 * Assessment management routes:
 * - DELETE /api/assessments: Delete one or more assessments (only if no invitations sent)
 * - POST /api/assessments/cancel: Cancel (archive) an assessment, sending emails to active invitations
 */
// eslint-disable-next-line drizzle/enforce-delete-with-where
export const route = factory
  .createApp()
  .post(
    "/cancel",
    auth(),
    zValidator(
      "json",
      z.object({
        id: z.string().uuid(),
      }),
    ),
    drizzle(),
    async (c) => {
      const tx = c.var.tx;
      const { id } = c.req.valid("json");
      const now = new Date();

      // Check if assessment exists and is not already archived
      const [assessment] = await tx
        .select()
        .from(assessments)
        .where(eq(assessments.id, id))
        .limit(1);

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (!assessment) {
        throw new HTTPException(404, {
          message: "Assessment not found",
        });
      }

      if (assessment.archivedAt) {
        throw new HTTPException(400, {
          message: "Assessment is already cancelled",
        });
      }

      // Get all active invitations for this assessment
      const activeInvitations = await tx
        .select({
          id: assessmentStudentInvitations.id,
          email: assessmentStudentInvitations.email,
          fullName: assessmentStudentInvitations.fullName,
        })
        .from(assessmentStudentInvitations)
        .where(
          and(
            eq(assessmentStudentInvitations.assessmentId, id),
            eq(assessmentStudentInvitations.active, true),
            isNull(assessmentStudentInvitations.archivedAt),
          ),
        );

      // Send cancellation emails to all active invitations
      const emailResults = await Promise.allSettled(
        activeInvitations.map(async (invitation) => {
          try {
            await sendCancellationEmail({
              to: invitation.email,
              studentName: invitation.fullName,
              assessmentTitle: assessment.name,
            });
            return { email: invitation.email, success: true };
          } catch (error) {
            console.error(
              `Failed to send cancellation email to ${invitation.email}:`,
              error,
            );
            throw error;
          }
        }),
      );

      const emailsSent = emailResults.filter(
        (r) => r.status === "fulfilled",
      ).length;
      const emailsFailed = emailResults.filter(
        (r) => r.status === "rejected",
      ).length;

      // Archive all invitations (both active and inactive) for this assessment
      await tx
        .update(assessmentStudentInvitations)
        .set({
          active: false,
          archivedAt: now,
        })
        .where(eq(assessmentStudentInvitations.assessmentId, id));

      // Archive all assessment problems
      await tx
        .update(assessmentProblems)
        .set({ archivedAt: now })
        .where(eq(assessmentProblems.assessment, id));

      // Archive all student assessments
      await tx
        .update(studentAssessments)
        .set({ archivedAt: now })
        .where(eq(studentAssessments.assessment, id));

      // Archive the assessment itself
      const [updatedAssessment] = await tx
        .update(assessments)
        .set({ archivedAt: now })
        .where(eq(assessments.id, id))
        .returning();

      return c.json({
        success: true,
        assessment: updatedAssessment,
        emailsSent,
        emailsFailed,
        invitationsArchived: activeInvitations.length,
      });
    },
  )
  .delete(
    "/",
    auth(),
    zValidator(
      "json",
      z.object({
        ids: z.array(z.string().uuid()).min(1),
      }),
    ),
    drizzle(),
    async (c) => {
      const tx = c.var.tx;
      const { ids } = c.req.valid("json");

      // Check if any of the assessments have active invitations (invitations that have been sent)
      const activeInvitations = await tx
        .select({
          assessmentId: assessmentStudentInvitations.assessmentId,
        })
        .from(assessmentStudentInvitations)
        .where(
          and(
            inArray(assessmentStudentInvitations.assessmentId, ids),
            eq(assessmentStudentInvitations.active, true),
            isNull(assessmentStudentInvitations.archivedAt),
          ),
        )
        .limit(1);

      if (activeInvitations.length > 0) {
        throw new HTTPException(400, {
          message:
            "Cannot delete assessments with sent invitations. Please cancel the assessment instead.",
        });
      }

      // Check if any of the assessments have student_assessments (students have started/completed)
      const existingStudentAssessments = await tx
        .select({
          assessmentId: studentAssessments.assessment,
        })
        .from(studentAssessments)
        .where(
          and(
            inArray(studentAssessments.assessment, ids),
            isNull(studentAssessments.archivedAt),
          ),
        )
        .limit(1);

      if (existingStudentAssessments.length > 0) {
        throw new HTTPException(400, {
          message:
            "Cannot delete assessments that students have already started. Please cancel the assessment instead.",
        });
      }

      // Delete assessment_problems first (even though cascade should handle it, being explicit)
      await tx
        .delete(assessmentProblems)
        .where(inArray(assessmentProblems.assessment, ids));

      // Delete any pending invitations (non-active ones)
      await tx
        .delete(assessmentStudentInvitations)
        .where(inArray(assessmentStudentInvitations.assessmentId, ids));

      // Delete the assessments
      const deletedAssessments = await tx
        .delete(assessments)
        .where(inArray(assessments.id, ids))
        .returning({ id: assessments.id });

      return c.json({
        deleted: deletedAssessments.map((a) => a.id),
        count: deletedAssessments.length,
      });
    },
  );
