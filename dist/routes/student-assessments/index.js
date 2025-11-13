import { eq, and, isNull } from "drizzle-orm";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { factory } from "../../factory.js";
import { assessments } from "../../drizzle/assessments.js";
import { studentAssessments } from "../../drizzle/student_assessments.js";
import { assessmentProblems } from "../../drizzle/assessment_problems.js";
import { users } from "../../drizzle/users.js";
import { auth } from "../../middlewares/auth.js";
import { drizzle } from "../../middlewares/drizzle.js";
const route = factory.createApp().get(
  "/:id",
  zValidator(
    "param",
    z.object({
      id: z.string().uuid()
    })
  ),
  auth(),
  drizzle(),
  async (c) => {
    const assessmentId = c.req.param("id");
    const { tx } = c.var;
    const jwtPayload = c.get("jwtPayload");
    const authUserId = jwtPayload.sub;
    const user = await tx.query.users.findFirst({
      where: eq(users.authUserId, authUserId)
    });
    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }
    const studentAssessment = await tx.query.studentAssessments.findFirst({
      where: and(
        eq(studentAssessments.assessment, assessmentId),
        eq(studentAssessments.student, user.id),
        isNull(studentAssessments.archivedAt)
      )
    });
    if (!studentAssessment) {
      return c.json({ error: "Assessment not found or access denied" }, 404);
    }
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
                description: true
              }
            }
          }
        }
      }
    });
    if (!assessment) {
      return c.json({ error: "Assessment not found" }, 404);
    }
    const now = /* @__PURE__ */ new Date();
    const scheduledDate = assessment.dateTimeScheduled ? new Date(assessment.dateTimeScheduled) : null;
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
            description: ap.problem.description
          }))
        }
      });
    }
    if (now < scheduledDate) {
      return c.json({
        status: "not_started",
        scheduledDate: scheduledDate.toISOString(),
        assessmentName: assessment.name
      });
    }
    const durationMinutes = Number(assessment.duration);
    const endDate = new Date(scheduledDate.getTime() + durationMinutes * 6e4);
    if (now > endDate) {
      return c.json({
        status: "ended",
        scheduledDate: scheduledDate.toISOString(),
        endDate: endDate.toISOString(),
        assessmentName: assessment.name
      });
    }
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
          description: ap.problem.description
        }))
      }
    });
  }
);
export {
  route
};
