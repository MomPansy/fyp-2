import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { HTTPException } from "hono/http-exception";
import { and, eq } from "drizzle-orm/sql/expressions/conditions";
import { factory } from "server/factory.ts";
import { auth } from "server/middlewares/auth.ts";
import { assessmentStatus } from "server/middlewares/assessment-status.ts";
import { drizzle } from "server/middlewares/drizzle.ts";
import {
  Dialect,
  SUPPORTED_DIALECTS,
} from "server/problem-database/mappings.ts";
import { getPool } from "server/problem-database/pool-manager.ts";
import type { QueryResult } from "server/problem-database/db-seed/index.ts";
import { executeQueryByDialect } from "server/problem-database/db-seed/query-executors.ts";
import type { DatabasePool } from "server/problem-database/pools.ts";
import { assessmentProblems } from "server/drizzle/assessment_problems.ts";
import { userProblems } from "server/drizzle/user_problems.ts";
import { submissions } from "server/drizzle/submissions.ts";
import { submissionDetails } from "server/drizzle/submission_details.ts";
import { studentAssessments } from "server/drizzle/student_assessments.ts";

// Helper function to grade a submission by comparing candidate result with answer
async function gradeSubmission(
  pool: DatabasePool,
  candidateResult: QueryResult,
  userProblem: { answer: string; dialect: Dialect },
  assessmentProblemId: string,
): Promise<{ grade: "pass" | "failed"; errorMessage: string | null }> {
  try {
    const answerResult = await executeQueryByDialect(
      pool,
      userProblem.answer,
      userProblem.dialect,
    );

    // Compare results
    const grade =
      JSON.stringify(candidateResult.rows) === JSON.stringify(answerResult.rows)
        ? "pass"
        : "failed";

    return { grade, errorMessage: null };
  } catch (answerError: unknown) {
    // If the answer query fails, mark as failed and capture the error
    const errorMessage =
      answerError instanceof Error ? answerError.message : String(answerError);

    console.error("Error executing answer query:", {
      assessmentProblemId,
      error: errorMessage,
      answer: userProblem.answer,
    });

    return {
      grade: "failed",
      errorMessage: `Failed to execute answer query: ${errorMessage}`,
    };
  }
}

export const route = factory
  .createApp()
  .get(
    "/:id",
    zValidator(
      "param",
      z.object({
        id: z.string().uuid(),
      }),
    ),
    auth(),
    drizzle(),
    assessmentStatus(),
    (c) => {
      const assessmentStatusResult = c.get("assessmentStatus");

      // Handle different assessment statuses
      if (assessmentStatusResult.status === "not_started") {
        return c.json({
          status: "not_started",
          scheduledDate: assessmentStatusResult.scheduledDate?.toISOString(),
          assessmentName: assessmentStatusResult.assessmentName,
        });
      }

      if (assessmentStatusResult.status === "ended") {
        return c.json({
          status: "ended",
          scheduledDate: assessmentStatusResult.scheduledDate?.toISOString(),
          endDate: assessmentStatusResult.endDate?.toISOString(),
          assessmentName: assessmentStatusResult.assessmentName,
        });
      }

      // Status is "active"
      const { assessment } = assessmentStatusResult;

      if (!assessment) {
        // This shouldn't happen, but TypeScript needs the check
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
          problems: assessment.problems,
        },
      });
    },
  )
  .post(
    "/:id/submit",
    zValidator(
      "param",
      z.object({
        id: z.string().uuid(),
      }),
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
        problemId: z.string(),
      }),
    ),
    async (c) => {
      const { id: assessmentId } = c.req.valid("param");
      const { podName, sql, dialect, problemId } = c.req.valid("json");

      const jwtPayload = c.get("jwtPayload");
      const studentId = jwtPayload.user_metadata.user_id;

      const { withTx } = c.var;
      const key = `${podName}-${dialect}`;
      const pool = getPool(key);

      if (!pool) {
        throw new HTTPException(404, {
          message: `No active connection pool found for pod: ${podName}. Please connect first.`,
        });
      }

      // get student_assessment_id using assessmentId and studentId from jwtPayload

      // create or update a submission
      // TODO: can shift this to route param on the frontend later
      const submissionId = await withTx(async (tx) => {
        const [studentAssessment] = await tx
          .select({
            studentAssessmentId: studentAssessments.id,
          })
          .from(studentAssessments)
          .where(
            and(
              eq(studentAssessments.assessment, assessmentId),
              eq(studentAssessments.student, studentId),
            ),
          );
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (!studentAssessment) {
          throw new HTTPException(404, {
            message: `Student assessment not found for assessment ID: ${assessmentId} and student ID: ${studentId}`,
          });
        }
        const studentAssessmentId = studentAssessment.studentAssessmentId;

        // create or update a submission
        const [submission] = await tx
          .insert(submissions)
          .values({
            studentAssessment: studentAssessmentId,
          } satisfies typeof submissions.$inferInsert)
          .returning({
            id: submissions.id,
          });
        return submission.id;
      });

      // Execute candidate's query and grade it
      try {
        // Execute the candidate's query
        const result = await executeQueryByDialect(pool, sql, dialect);

        // Get user problem with answer
        const userProblem = await withTx(async (tx) => {
          const [userProblem] = await tx
            .select({
              answer: userProblems.answer,
              dialect: userProblems.dialect,
            })
            .from(assessmentProblems)
            .innerJoin(
              userProblems,
              eq(assessmentProblems.problem, userProblems.id),
            )
            .where(eq(assessmentProblems.id, problemId));

          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          if (!userProblem) {
            throw new HTTPException(404, {
              message: `Problem not found for assessment problem ID: ${problemId}`,
            });
          }

          if (!userProblem.answer) {
            throw new HTTPException(400, {
              message: `No answer provided for problem ID: ${problemId}`,
            });
          }

          return {
            answer: userProblem.answer,
            dialect: userProblem.dialect,
          };
        });

        // Grade the submission by comparing with the answer
        const gradeResult = await gradeSubmission(
          pool,
          result,
          userProblem,
          problemId,
        );

        // Insert submission details
        await withTx(async (tx) => {
          await tx.insert(submissionDetails).values({
            submissionId,
            assignmentProblemId: problemId,
            candidateAnswer: sql,
            dialect,
            grade: gradeResult.grade,
          } satisfies typeof submissionDetails.$inferInsert);
        });

        // Return the candidate's result along with grading info
        return c.json({
          ...result,
          grade: gradeResult.grade,
          ...(gradeResult.errorMessage && {
            gradeError: gradeResult.errorMessage,
          }),
        });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("Query execution error:", message);
        // Return the SQL error message in the response so the terminal can display it
        return c.json(
          {
            error: message,
          },
          400,
        );
      }
    },
  );
