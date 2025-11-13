import { HTTPException } from "hono/http-exception";
import { eq, and, isNull, inArray } from "drizzle-orm";
import { factory } from "../../factory.js";
import { auth } from "../../middlewares/auth.js";
import { drizzle } from "../../middlewares/drizzle.js";
import { users } from "../../drizzle/users.js";
import { assessmentStudentInvitations } from "../../drizzle/assessment_student_invitations.js";
import { studentAssessments } from "../../drizzle/student_assessments.js";
const route = factory.createApp().post("/process-invitation", auth(), drizzle(), async (c) => {
  const jwtPayload = c.get("jwtPayload");
  const auth_user_id = jwtPayload.sub;
  const email = jwtPayload.email;
  const tx = c.var.tx;
  try {
    const invitations = await tx.select().from(assessmentStudentInvitations).where(
      and(
        eq(assessmentStudentInvitations.email, email),
        isNull(assessmentStudentInvitations.archivedAt)
      )
    );
    if (invitations.length === 0) {
      console.warn(`No invitation found for email: ${email}`);
      return c.json({
        message: `No pending invitation found for email: ${email}`
      });
    }
    const invitee = invitations[0];
    const updatedUsers = await tx.update(users).set({
      email,
      fullName: invitee.fullName,
      matriculationNumber: invitee.matriculationNumber
    }).where(eq(users.authUserId, auth_user_id)).returning();
    if (updatedUsers.length === 0) {
      console.error("Error updating user: user not found");
      throw new HTTPException(500, {
        message: "Failed to update user information"
      });
    }
    const userData = updatedUsers[0];
    await tx.update(assessmentStudentInvitations).set({ archivedAt: /* @__PURE__ */ new Date() }).where(
      inArray(
        assessmentStudentInvitations.id,
        invitations.map((inv) => inv.id)
      )
    );
    const assessmentIds = invitations.map((inv) => inv.assessmentId);
    await tx.insert(studentAssessments).values(
      assessmentIds.map((assessmentId) => ({
        assessment: assessmentId,
        student: userData.id
      }))
    ).onConflictDoNothing();
    console.info(`Successfully processed invitation for user ${email}`);
    return c.json({
      assessments: assessmentIds.map((id) => ({ id }))
    });
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error;
    }
    console.error("Unexpected error in process-invitation:", error);
    throw new HTTPException(500, {
      message: "An unexpected error occurred"
    });
  }
});
export {
  route
};
