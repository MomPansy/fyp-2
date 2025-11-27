import { eq, and, isNull, sql } from "drizzle-orm";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";

import { type Variables as AuthVariables } from "./auth.ts";
import { assessments } from "server/drizzle/assessments.ts";
import { studentAssessments } from "server/drizzle/student_assessments.ts";
import { assessmentProblems } from "server/drizzle/assessment_problems.ts";
import { users } from "server/drizzle/users.ts";
import { getAssessmentTimingStatus } from "server/lib/assessment-utils.ts";
import { db, type Tx } from "server/lib/db.ts";

export type AssessmentStatus = "not_started" | "active" | "ended";

export interface AssessmentData {
  id: string;
  name: string;
  duration: string;
  dateTimeScheduled: Date | null;
  endDate?: Date | null;
  problems: {
    id: string;
    name: string;
    description: string | null;
  }[];
}

export interface AssessmentStatusResult {
  status: AssessmentStatus;
  assessment?: AssessmentData;
  scheduledDate: Date | null;
  endDate: Date | null;
  assessmentName: string;
}

export interface AssessmentStatusVariables {
  assessmentStatus: AssessmentStatusResult;
  studentAssessmentId: string;
}

export type Variables = AssessmentStatusVariables & AuthVariables;

// Input variables that should be set by parent middlewares (auth)
// These are marked as potentially undefined to catch missing middleware errors at runtime
type InputVariables = Partial<AuthVariables>;

/**
 * Middleware that checks if a student has access to an assessment and determines its status.
 * Requires auth() middleware to be applied first.
 * This middleware handles its own database transaction internally.
 *
 * Usage:
 * ```ts
 * app.get('/:id',
 *   zValidator('param', z.object({ id: z.string().uuid() })),
 *   auth(),
 *   assessmentStatus(),
 *   async (c) => {
 *     const { status, assessment } = c.get('assessmentStatus');
 *     // ... handle based on status
 *   }
 * );
 * ```
 */
export function assessmentStatus() {
  return createMiddleware<{
    Variables: AssessmentStatusVariables & InputVariables;
  }>(async (c, next) => {
    const assessmentId = c.req.param("id");
    const jwtPayload = c.get("jwtPayload");

    if (!jwtPayload) {
      throw new Error(
        "assessmentStatus() middleware requires auth() middleware to be applied first",
      );
    }

    if (!assessmentId) {
      throw new HTTPException(400, {
        res: Response.json(
          {
            error: "Missing assessment ID",
            message: "Assessment ID is required in the URL",
          },
          { status: 400 },
        ),
      });
    }

    // Run the assessment status check in a transaction with RLS
    const result = await db.transaction(async (tx: Tx) => {
      // Set up RLS context
      await tx.execute(
        sql`select set_config('request.jwt.claims', ${JSON.stringify(jwtPayload)}, TRUE)`,
      );
      await tx.execute(sql`set local role authenticated`);

      // Get the auth user ID from JWT (this is the Supabase auth.users.id)
      const authUserId = jwtPayload.sub;

      // Look up the internal user ID from our users table
      const user = await tx.query.users.findFirst({
        where: eq(users.authUserId, authUserId),
      });

      if (!user) {
        throw new HTTPException(404, {
          res: Response.json(
            {
              error: "User not found",
              message: "User account not found in the system",
            },
            { status: 404 },
          ),
        });
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
        throw new HTTPException(404, {
          res: Response.json(
            {
              error: "Assessment not found or access denied",
              message:
                "You are not invited to this assessment or it does not exist",
            },
            { status: 404 },
          ),
        });
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
        throw new HTTPException(404, {
          res: Response.json(
            {
              error: "Assessment not found",
              message: "The requested assessment does not exist",
            },
            { status: 404 },
          ),
        });
      }

      return { user, studentAssessment, assessment };
    });

    const { studentAssessment, assessment } = result;

    // Use shared utility for timing status calculation
    const timing = getAssessmentTimingStatus(
      assessment.dateTimeScheduled,
      assessment.duration,
    );

    const assessmentData: AssessmentData = {
      id: assessment.id,
      name: assessment.name,
      duration: assessment.duration,
      dateTimeScheduled: assessment.dateTimeScheduled,
      problems: assessment.assessmentProblems.map((ap) => ({
        id: ap.problem.id,
        name: ap.problem.name,
        description: ap.problem.description,
      })),
    };

    // If no scheduled date, assessment is always available
    if (timing.status === "active" && !timing.scheduledDate) {
      c.set("assessmentStatus", {
        status: "active",
        assessment: assessmentData,
        assessmentName: assessment.name,
        scheduledDate: null,
        endDate: null,
      });
      c.set("studentAssessmentId", studentAssessment.id);
      await next();
      return;
    }

    // Assessment has not started yet
    if (timing.status === "not_started") {
      c.set("assessmentStatus", {
        status: "not_started",
        scheduledDate: timing.scheduledDate,
        assessmentName: assessment.name,
        endDate: timing.endDate,
      });
      c.set("studentAssessmentId", studentAssessment.id);
      await next();
      return;
    }

    // Assessment has ended
    if (timing.status === "ended") {
      c.set("assessmentStatus", {
        status: "ended",
        scheduledDate: timing.scheduledDate,
        endDate: timing.endDate,
        assessmentName: assessment.name,
      });
      c.set("studentAssessmentId", studentAssessment.id);
      await next();
      return;
    }

    // Assessment is active
    assessmentData.endDate = timing.endDate;
    c.set("assessmentStatus", {
      status: "active",
      assessment: assessmentData,
      scheduledDate: timing.scheduledDate,
      endDate: timing.endDate,
      assessmentName: assessment.name,
    });
    c.set("studentAssessmentId", studentAssessment.id);
    await next();
  });
}
