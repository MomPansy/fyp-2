import { eq, and, isNull } from "drizzle-orm";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { assessments } from "../drizzle/assessments.js";
import { studentAssessments } from "../drizzle/student_assessments.js";
import { assessmentProblems } from "../drizzle/assessment_problems.js";
import { users } from "../drizzle/users.js";
import { getAssessmentTimingStatus } from "../lib/assessment-utils.js";
function assessmentStatus() {
  return createMiddleware(async (c, next) => {
    const assessmentId = c.req.param("id");
    const tx = c.get("tx");
    const jwtPayload = c.get("jwtPayload");
    if (!jwtPayload) {
      throw new Error(
        "assessmentStatus() middleware requires auth() middleware to be applied first"
      );
    }
    if (!tx) {
      throw new Error(
        "assessmentStatus() middleware requires drizzle() middleware to be applied first"
      );
    }
    if (!assessmentId) {
      throw new HTTPException(400, {
        res: Response.json(
          {
            error: "Missing assessment ID",
            message: "Assessment ID is required in the URL"
          },
          { status: 400 }
        )
      });
    }
    const authUserId = jwtPayload.sub;
    const user = await tx.query.users.findFirst({
      where: eq(users.authUserId, authUserId)
    });
    if (!user) {
      throw new HTTPException(404, {
        res: Response.json(
          {
            error: "User not found",
            message: "User account not found in the system"
          },
          { status: 404 }
        )
      });
    }
    const studentAssessment = await tx.query.studentAssessments.findFirst({
      where: and(
        eq(studentAssessments.assessment, assessmentId),
        eq(studentAssessments.student, user.id),
        isNull(studentAssessments.archivedAt)
      )
    });
    if (!studentAssessment) {
      throw new HTTPException(404, {
        res: Response.json(
          {
            error: "Assessment not found or access denied",
            message: "You are not invited to this assessment or it does not exist"
          },
          { status: 404 }
        )
      });
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
      throw new HTTPException(404, {
        res: Response.json(
          {
            error: "Assessment not found",
            message: "The requested assessment does not exist"
          },
          { status: 404 }
        )
      });
    }
    const timing = getAssessmentTimingStatus(
      assessment.dateTimeScheduled,
      assessment.duration
    );
    const assessmentData = {
      id: assessment.id,
      name: assessment.name,
      duration: assessment.duration,
      dateTimeScheduled: assessment.dateTimeScheduled,
      problems: assessment.assessmentProblems.map((ap) => ({
        id: ap.problem.id,
        name: ap.problem.name,
        description: ap.problem.description
      }))
    };
    if (timing.status === "active" && !timing.scheduledDate) {
      c.set("assessmentStatus", {
        status: "active",
        assessment: assessmentData,
        assessmentName: assessment.name,
        scheduledDate: null,
        endDate: null
      });
      c.set("studentAssessmentId", studentAssessment.id);
      await next();
      return;
    }
    if (timing.status === "not_started") {
      c.set("assessmentStatus", {
        status: "not_started",
        scheduledDate: timing.scheduledDate,
        assessmentName: assessment.name,
        endDate: timing.endDate
      });
      c.set("studentAssessmentId", studentAssessment.id);
      await next();
      return;
    }
    if (timing.status === "ended") {
      c.set("assessmentStatus", {
        status: "ended",
        scheduledDate: timing.scheduledDate,
        endDate: timing.endDate,
        assessmentName: assessment.name
      });
      c.set("studentAssessmentId", studentAssessment.id);
      await next();
      return;
    }
    assessmentData.endDate = timing.endDate;
    c.set("assessmentStatus", {
      status: "active",
      assessment: assessmentData,
      scheduledDate: timing.scheduledDate,
      endDate: timing.endDate,
      assessmentName: assessment.name
    });
    c.set("studentAssessmentId", studentAssessment.id);
    await next();
  });
}
export {
  assessmentStatus
};
