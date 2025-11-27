import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { HTTPException } from "hono/http-exception";
import { eq } from "drizzle-orm/sql/expressions/conditions";
import { factory } from "../../factory.js";
import { auth } from "../../middlewares/auth.js";
import { assessmentStatus } from "../../middlewares/assessment-status.js";
import { drizzle } from "../../middlewares/drizzle.js";
import {
  SUPPORTED_DIALECTS
} from "../../problem-database/mappings.js";
import { getPool } from "../../problem-database/pool-manager.js";
import { executeQueryByDialect } from "../../problem-database/db-seed/query-executors.js";
import { assessmentProblems } from "../../drizzle/assessment_problems.js";
import { userProblems } from "../../drizzle/user_problems.js";
import { submissions } from "../../drizzle/submissions.js";
import { submissionDetails } from "../../drizzle/submission_details.js";
async function gradeSubmission(pool, candidateResult, userProblem, assessmentProblemId) {
  try {
    const answerResult = await executeQueryByDialect(
      pool,
      userProblem.answer,
      userProblem.dialect
    );
    const grade = JSON.stringify(candidateResult.rows) === JSON.stringify(answerResult.rows) ? "pass" : "failed";
    return { grade, errorMessage: null };
  } catch (answerError) {
    const errorMessage = answerError instanceof Error ? answerError.message : String(answerError);
    console.error("Error executing answer query:", {
      assessmentProblemId,
      error: errorMessage,
      answer: userProblem.answer
    });
    return {
      grade: "failed",
      errorMessage: `Failed to execute answer query: ${errorMessage}`
    };
  }
}
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
  assessmentStatus(),
  (c) => {
    const assessmentStatusResult = c.get("assessmentStatus");
    if (assessmentStatusResult.status === "not_started") {
      return c.json({
        status: "not_started",
        scheduledDate: assessmentStatusResult.scheduledDate?.toISOString(),
        assessmentName: assessmentStatusResult.assessmentName
      });
    }
    if (assessmentStatusResult.status === "ended") {
      return c.json({
        status: "ended",
        scheduledDate: assessmentStatusResult.scheduledDate?.toISOString(),
        endDate: assessmentStatusResult.endDate?.toISOString(),
        assessmentName: assessmentStatusResult.assessmentName
      });
    }
    const { assessment } = assessmentStatusResult;
    if (!assessment) {
      return c.json({ error: "Assessment data missing" }, 500);
    }
    return c.json({
      status: "active",
      assessment: {
        id: assessment.id,
        name: assessment.name,
        duration: assessment.duration,
        dateTimeScheduled: assessment.dateTimeScheduled,
        endDate: assessment.endDate?.toISOString(),
        problems: assessment.problems
      }
    });
  }
).post(
  "/:id/submit",
  zValidator(
    "param",
    z.object({
      id: z.string().uuid()
    })
  ),
  auth(),
  drizzle({ lazy: true }),
  assessmentStatus(),
  zValidator(
    "json",
    z.object({
      podName: z.string(),
      sql: z.string(),
      dialect: z.enum(SUPPORTED_DIALECTS),
      assessmentProblemId: z.string()
    })
  ),
  async (c) => {
    const { id: studentAssessmentId } = c.req.valid("param");
    const { podName, sql, dialect, assessmentProblemId } = c.req.valid("json");
    const { withTx } = c.var;
    const key = `${podName}-${dialect}`;
    const pool = getPool(key);
    if (!pool) {
      throw new HTTPException(404, {
        message: `No active connection pool found for pod: ${podName}. Please connect first.`
      });
    }
    const submissionId = await withTx(async (tx) => {
      const [submission] = await tx.insert(submissions).values({
        studentAssessment: studentAssessmentId
      }).onConflictDoUpdate({
        target: submissions.studentAssessment,
        set: {
          updatedAt: /* @__PURE__ */ new Date()
        }
      }).returning({
        id: submissions.id
      });
      return submission.id;
    });
    try {
      const result = await executeQueryByDialect(pool, sql, dialect);
      const userProblem = await withTx(async (tx) => {
        const [userProblem2] = await tx.select({
          answer: userProblems.answer,
          dialect: userProblems.dialect
        }).from(assessmentProblems).innerJoin(
          userProblems,
          eq(assessmentProblems.problem, userProblems.id)
        ).where(eq(assessmentProblems.id, assessmentProblemId));
        if (!userProblem2) {
          throw new HTTPException(404, {
            message: `Problem not found for assessment problem ID: ${assessmentProblemId}`
          });
        }
        if (!userProblem2.answer) {
          throw new HTTPException(400, {
            message: `No answer provided for problem ID: ${assessmentProblemId}`
          });
        }
        return {
          answer: userProblem2.answer,
          dialect: userProblem2.dialect
        };
      });
      const gradeResult = await gradeSubmission(
        pool,
        result,
        userProblem,
        assessmentProblemId
      );
      await withTx(async (tx) => {
        await tx.insert(submissionDetails).values({
          submissionId,
          assignmentProblemId: assessmentProblemId,
          candidateAnswer: sql,
          dialect,
          grade: gradeResult.grade
        });
      });
      return c.json({
        ...result,
        grade: gradeResult.grade,
        ...gradeResult.errorMessage && {
          gradeError: gradeResult.errorMessage
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Query execution error:", message);
      return c.json(
        {
          error: message
        },
        400
      );
    }
  }
);
export {
  route
};
