import { HTTPException } from "hono/http-exception";
import { eq, and, isNull, inArray } from "drizzle-orm";

import { factory } from "server/factory.ts";
import { auth } from "server/middlewares/auth.ts";
import { drizzle } from "server/middlewares/drizzle.ts";
import { users } from "server/drizzle/users.ts";
import { assessmentStudentInvitations } from "server/drizzle/assessment_student_invitations.ts";
import { studentAssessments } from "server/drizzle/student_assessments.ts";

export const route = factory
  .createApp()
  .post("/process-invitation", auth(), drizzle(), async (c) => {
    // auth() middleware guarantees jwtPayload exists
    const jwtPayload = c.get("jwtPayload");
    const auth_user_id = jwtPayload.sub;
    const email = jwtPayload.email;
    const tx = c.var.tx;

    try {
      // Fetch pending invitations
      const invitations = await tx
        .select()
        .from(assessmentStudentInvitations)
        .where(
          and(
            eq(assessmentStudentInvitations.email, email),
            isNull(assessmentStudentInvitations.archivedAt),
          ),
        );

      if (invitations.length === 0) {
        console.warn(`No invitation found for email: ${email}`);
        return c.json({
          message: `No pending invitation found for email: ${email}`,
        });
      }

      const invitee = invitations[0];

      // Update user information
      const updatedUsers = await tx
        .update(users)
        .set({
          email: email,
          fullName: invitee.fullName,
          matriculationNumber: invitee.matriculationNumber,
        })
        .where(eq(users.authUserId, auth_user_id))
        .returning();

      if (updatedUsers.length === 0) {
        console.error("Error updating user: user not found");
        throw new HTTPException(500, {
          message: "Failed to update user information",
        });
      }

      const userData = updatedUsers[0];

      // Archive invitations
      await tx
        .update(assessmentStudentInvitations)
        .set({ archivedAt: new Date() })
        .where(
          inArray(
            assessmentStudentInvitations.id,
            invitations.map((inv) => inv.id),
          ),
        );

      // Create student assessment records
      const assessmentIds = invitations.map((inv) => inv.assessmentId);
      await tx
        .insert(studentAssessments)
        .values(
          assessmentIds.map((assessmentId) => ({
            assessment: assessmentId,
            student: userData.id,
          })),
        )
        .onConflictDoNothing();

      console.info(`Successfully processed invitation for user ${email}`);

      return c.json({
        assessments: assessmentIds.map((id) => ({ id })),
      });
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error;
      }
      console.error("Unexpected error in process-invitation:", error);
      throw new HTTPException(500, {
        message: "An unexpected error occurred",
      });
    }
  });
