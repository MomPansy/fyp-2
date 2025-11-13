import { eq, and, isNull } from "drizzle-orm";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { factory } from "server/factory.ts";
import { assessments } from "server/drizzle/assessments.ts";
import { studentAssessments } from "server/drizzle/student_assessments.ts";
import { assessmentProblems } from "server/drizzle/assessment_problems.ts";
import { users } from "server/drizzle/users.ts";
import { auth } from "server/middlewares/auth.ts";
import { drizzle } from "server/middlewares/drizzle.ts";

export const route = factory.createApp().get(
  "/:id",
  zValidator(
    "param",
    z.object({
      id: z.string().uuid(),
    }),
  ),
  auth(),
  drizzle(),
  async (c) => {
    const assessmentId = c.req.param("id");
    const { tx } = c.var;
    const jwtPayload = c.get("jwtPayload");

    // Get the auth user ID from JWT (this is the Supabase auth.users.id)
    const authUserId = jwtPayload.sub;

    // Look up the internal user ID from our users table
    const user = await tx.query.users.findFirst({
      where: eq(users.authUserId, authUserId),
    });

    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    // Check if student is invited to this assessment
    const studentAssessment = await tx.query.studentAssessments.findFirst({
      where: and(
        eq(studentAssessments.assessment, assessmentId),
        eq(studentAssessments.student, user.id),
        isNull(studentAssessments.archivedAt),
      ),
    });

    if (!studentAssessment) {
      return c.json({ error: "Assessment not found or access denied" }, 404);
    }

    // Fetch the assessment with its problems
    const assessment = await tx.query.assessments.findFirst({
      where: eq(assessments.id, assessmentId),
      with: {
        assessmentProblems: {
          where: isNull(assessmentProblems.archivedAt),
          with: {
            problem: {
              columns: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
        },
      },
    });

    if (!assessment) {
      return c.json({ error: "Assessment not found" }, 404);
    }

    // Server-side validation of assessment timing
    const now = new Date();
    const scheduledDate = assessment.dateTimeScheduled
      ? new Date(assessment.dateTimeScheduled)
      : null;

    // If no scheduled date, assessment is always available
    if (!scheduledDate) {
      return c.json({
        status: "active",
        assessment: {
          id: assessment.id,
          name: assessment.name,
          duration: assessment.duration,
          dateTimeScheduled: assessment.dateTimeScheduled,
          problems: assessment.assessmentProblems.map((ap) => ({
            id: ap.problem.id,
            name: ap.problem.name,
            description: ap.problem.description,
          })),
        },
      });
    }

    // Assessment has not started yet
    if (now < scheduledDate) {
      return c.json({
        status: "not_started",
        scheduledDate: scheduledDate.toISOString(),
        assessmentName: assessment.name,
      });
    }

    // Calculate end time
    const durationMinutes = Number(assessment.duration);
    const endDate = new Date(scheduledDate.getTime() + durationMinutes * 60000);

    // Assessment has ended
    if (now > endDate) {
      return c.json({
        status: "ended",
        scheduledDate: scheduledDate.toISOString(),
        endDate: endDate.toISOString(),
        assessmentName: assessment.name,
      });
    }

    // Assessment is active
    return c.json({
      status: "active",
      assessment: {
        id: assessment.id,
        name: assessment.name,
        duration: assessment.duration,
        dateTimeScheduled: assessment.dateTimeScheduled,
        endDate: endDate.toISOString(),
        problems: assessment.assessmentProblems.map((ap) => ({
          id: ap.problem.id,
          name: ap.problem.name,
          description: ap.problem.description,
        })),
      },
    });
  },
);
