import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq } from "drizzle-orm/sql/expressions/conditions";
import { factory } from "server/factory.ts";
import { auth } from "server/middlewares/auth.ts";
import { drizzle } from "server/middlewares/drizzle.ts";
import { submissions } from "server/drizzle/submissions.ts";
import { submissionDetails } from "server/drizzle/submission_details.ts";
import { studentAssessments } from "server/drizzle/student_assessments.ts";
import { assessmentProblems } from "server/drizzle/assessment_problems.ts";
import { userProblems } from "server/drizzle/user_problems.ts";
import { users } from "server/drizzle/users.ts";

export const route = factory.createApp().get(
  "/assessment/:assessmentId",
  zValidator(
    "param",
    z.object({
      assessmentId: z.string().uuid(),
    }),
  ),
  auth(),
  drizzle(),
  async (c) => {
    const { assessmentId } = c.req.valid("param");
    const tx = c.get("tx");

    // Query all submissions for this assessment by joining through student_assessments
    const result = await tx
      .select({
        submission: {
          id: submissions.id,
          createdAt: submissions.createdAt,
        },
        studentAssessment: {
          id: studentAssessments.id,
        },
        user: {
          id: users.id,
          email: users.email,
          fullName: users.fullName,
          matriculationNumber: users.matriculationNumber,
        },
        submissionDetail: {
          id: submissionDetails.id,
          candidateAnswer: submissionDetails.candidateAnswer,
          grade: submissionDetails.grade,
          dialect: submissionDetails.dialect,
          assessmentProblemId: submissionDetails.assessmentProblemId,
        },
        problem: {
          id: userProblems.id,
          name: userProblems.name,
        },
      })
      .from(submissions)
      .innerJoin(
        studentAssessments,
        eq(submissions.studentAssessment, studentAssessments.id),
      )
      .innerJoin(users, eq(studentAssessments.student, users.id))
      .innerJoin(
        submissionDetails,
        eq(submissionDetails.submissionId, submissions.id),
      )
      .innerJoin(
        assessmentProblems,
        eq(submissionDetails.assessmentProblemId, assessmentProblems.id),
      )
      .innerJoin(userProblems, eq(assessmentProblems.problem, userProblems.id))
      .where(eq(studentAssessments.assessment, assessmentId));

    // Group submissions by submission ID with their details
    const submissionsMap = new Map<
      string,
      {
        id: string;
        createdAt: Date;
        user: {
          id: string;
          email: string;
          fullName: string | null;
          matriculationNumber: string | null;
        };
        details: {
          id: string;
          candidateAnswer: string;
          grade: string;
          dialect: string;
          problem: {
            id: string;
            name: string;
          };
        }[];
      }
    >();

    for (const row of result) {
      if (!submissionsMap.has(row.submission.id)) {
        submissionsMap.set(row.submission.id, {
          id: row.submission.id,
          createdAt: row.submission.createdAt,
          user: row.user,
          details: [],
        });
      }

      const submissionEntry = submissionsMap.get(row.submission.id);
      if (submissionEntry) {
        submissionEntry.details.push({
          id: row.submissionDetail.id,
          candidateAnswer: row.submissionDetail.candidateAnswer,
          grade: row.submissionDetail.grade,
          dialect: row.submissionDetail.dialect,
          problem: row.problem,
        });
      }
    }

    const submissionsArray = Array.from(submissionsMap.values()).sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return c.json({ submissions: submissionsArray });
  },
);
