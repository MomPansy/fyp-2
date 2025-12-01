import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { HTTPException } from "hono/http-exception";
import { and, eq } from "drizzle-orm/sql/expressions/conditions";
import { factory } from "../../factory.js";
import { auth } from "../../middlewares/auth.js";
import { assessmentStatus } from "../../middlewares/assessment-status.js";
import { drizzle } from "../../middlewares/drizzle.js";
import {
  SUPPORTED_DIALECTS
} from "../../problem-database/mappings.js";
import { getPool } from "../../problem-database/pool-manager.js";
import { executeQueryByDialect } from "../../problem-database/db-seed/query-executors.js";
import { userProblems } from "../../drizzle/user_problems.js";
import { submissions } from "../../drizzle/submissions.js";
import { submissionDetails } from "../../drizzle/submission_details.js";
import { studentAssessments } from "../../drizzle/student_assessments.js";
import { assessmentProblems } from "../../drizzle/assessment_problems.js";
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
      key: z.string(),
      sql: z.string(),
      dialect: z.enum(SUPPORTED_DIALECTS),
      problemId: z.string()
    })
  ),
  async (c) => {
    const { id: assessmentId } = c.req.valid("param");
    const { key, sql, dialect, problemId } = c.req.valid("json");
    const jwtPayload = c.get("jwtPayload");
    const studentId = jwtPayload.user_metadata.user_id;
    const { withTx } = c.var;
    const pool = await getPool(key);
    if (!pool) {
      throw new HTTPException(404, {
        message: `No active connection pool found for pod: ${key}. Please connect first.`
      });
    }
    const submissionId = await withTx(async (tx) => {
      const [studentAssessment] = await tx.select({
        studentAssessmentId: studentAssessments.id
      }).from(studentAssessments).where(
        and(
          eq(studentAssessments.assessment, assessmentId),
          eq(studentAssessments.student, studentId)
        )
      );
      if (!studentAssessment) {
        throw new HTTPException(404, {
          message: `Student assessment not found for assessment ID: ${assessmentId} and student ID: ${studentId}`
        });
      }
      const studentAssessmentId = studentAssessment.studentAssessmentId;
      const [submission] = await tx.insert(submissions).values({
        studentAssessment: studentAssessmentId
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
        }).from(userProblems).where(eq(userProblems.id, problemId));
        if (!userProblem2) {
          throw new HTTPException(404, {
            message: `Problem not found for assessment problem ID: ${problemId}`
          });
        }
        if (!userProblem2.answer) {
          throw new HTTPException(400, {
            message: `No answer provided for problem ID: ${problemId}`
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
        problemId
      );
      await withTx(async (tx) => {
        const [assessmentProblem] = await tx.select({
          id: assessmentProblems.id
        }).from(assessmentProblems).where(
          and(
            eq(assessmentProblems.assessment, assessmentId),
            eq(assessmentProblems.problem, problemId)
          )
        );
        if (!assessmentProblem) {
          throw new HTTPException(404, {
            message: `Assessment problem not found for assessment ID: ${assessmentId} and problem ID: ${problemId}`
          });
        }
        await tx.insert(submissionDetails).values({
          submissionId,
          assessmentProblemId: assessmentProblem.id,
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
