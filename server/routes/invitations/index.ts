import { zValidator } from "@hono/zod-validator";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { eq } from "drizzle-orm";

import { factory } from "../../factory.ts";
import { supabase } from "../../lib/supabase.ts";
import {
  signInvitationToken,
  getInvitationExpiration,
  generateInvitationUrl,
  verifyInvitationToken,
} from "../../lib/invitation-jwt.ts";
import { sendInvitationEmail } from "../../lib/mailer.ts";
import { drizzle } from "server/middlewares/drizzle.ts";
import { assessmentStudentInvitations } from "server/drizzle/assessment_student_invitations.ts";
import { assessments } from "server/drizzle/assessments.ts";

/**
 * Invitation routes:
 * - POST /api/invitations/send: Generate tokens and send invitation emails
 * - GET /api/invitations/:token: Verify token and return invitation details (read-only)
 * - POST /api/invitations/:token/accept: Accept invitation and create/recognize user account
 */
export const route = factory
  .createApp()
  .post(
    "/send",
    zValidator(
      "json",
      z.object({
        assessmentId: z.string().uuid(),
      }),
    ),
    drizzle(),
    async (c) => {
      const tx = c.var.tx;
      try {
        const { assessmentId } = c.req.valid("json");

        // Get assessment details first
        const [assessment] = await tx
          .select()
          .from(assessments)
          .where(eq(assessments.id, assessmentId))
          .limit(1);

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (!assessment) {
          throw new HTTPException(404, {
            message: "Assessment not found",
          });
        }

        if (!assessment.dateTimeScheduled) {
          throw new HTTPException(400, {
            message:
              "Assessment must have a scheduled date/time before sending invitations",
          });
        }

        // Mark all invitations as active (within transaction)
        const invitations = await tx
          .update(assessmentStudentInvitations)
          .set({ active: true })
          .where(eq(assessmentStudentInvitations.assessmentId, assessmentId))
          .returning();

        if (invitations.length === 0) {
          return c.json({
            success: true,
            message: "No invitations to send",
            sent: 0,
          });
        }

        const dateTimeScheduled = new Date(assessment.dateTimeScheduled);
        const expirationTimestamp = getInvitationExpiration(dateTimeScheduled);

        // Send emails
        const results = await Promise.allSettled(
          invitations.map(async (invitation) => {
            try {
              const token = await signInvitationToken(
                {
                  invitationId: invitation.id,
                  assessmentId: assessment.id,
                  email: invitation.email,
                  fullName: invitation.fullName,
                  matriculationNumber: invitation.matriculationNumber,
                },
                expirationTimestamp,
              );

              // Update invitation token (within transaction)
              await tx
                .update(assessmentStudentInvitations)
                .set({ invitationToken: token })
                .where(eq(assessmentStudentInvitations.id, invitation.id));

              const inviteLink = generateInvitationUrl(token);

              await sendInvitationEmail({
                to: invitation.email,
                studentName: invitation.fullName,
                assessmentTitle: assessment.name,
                inviteLink,
                dueDate: dateTimeScheduled.toLocaleDateString(),
              });

              return { email: invitation.email, success: true };
            } catch (error) {
              console.error(
                `Failed to send invitation to ${invitation.email}:`,
                error,
              );
              throw error;
            }
          }),
        );

        const successful = results.filter(
          (r) => r.status === "fulfilled",
        ).length;
        const failed = results.filter((r) => r.status === "rejected");

        return c.json({
          success: true,
          message: `Sent ${successful} invitation(s)`,
          sent: successful,
          failed: failed.length,
          errors: failed.map((f) =>
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            f.status === "rejected" ? String(f.reason) : null,
          ),
        });
      } catch (error) {
        console.error("Error sending invitations:", error);
        if (error instanceof HTTPException) throw error;
        throw new HTTPException(500, {
          message:
            error instanceof Error
              ? error.message
              : "Failed to send invitations",
        });
      }
    },
  )
  .get(
    "/:token",
    zValidator(
      "param",
      z.object({
        token: z.string(),
      }),
    ),
    async (c) => {
      try {
        const token = c.req.param("token");
        const payload = await verifyInvitationToken(token);

        const { data: invitation, error: invitationError } = await supabase
          .from("assessment_student_invitations")
          .select("*, assessments(*)")
          .eq("id", payload.invitationId)
          .single();

        if (invitationError) {
          throw new HTTPException(404, { message: "Invitation not found" });
        }

        if (!invitation.active) {
          throw new HTTPException(400, { message: "Invitation is not active" });
        }

        // Just return invitation details, don't create account yet
        return c.json({
          success: true,
          invitation: {
            email: payload.email,
            fullName: payload.fullName,
            matriculationNumber: payload.matriculationNumber,
            assessmentTitle: invitation.assessments.name,
            assessmentDate: invitation.assessments.date_time_scheduled,
            assessmentId: payload.assessmentId,
            isActive: invitation.active,
          },
        });
      } catch (error) {
        console.error("Error fetching invitation:", error);
        if (error instanceof HTTPException) throw error;
        if (error instanceof Error && error.message.includes("expired")) {
          throw new HTTPException(400, {
            message: "Invitation link has expired",
          });
        }
        throw new HTTPException(500, {
          message:
            error instanceof Error
              ? error.message
              : "Failed to fetch invitation",
        });
      }
    },
  )
  .get(
    "/:token/accept",
    zValidator(
      "param",
      z.object({
        token: z.string(),
      }),
    ),
    async (c) => {
      try {
        const token = c.req.param("token");
        const payload = await verifyInvitationToken(token);

        const { data: invitation, error: invitationError } = await supabase
          .from("assessment_student_invitations")
          .select("*")
          .eq("id", payload.invitationId)
          .single();

        if (invitationError) {
          throw new HTTPException(404, { message: "Invitation not found" });
        }

        if (!invitation.active) {
          throw new HTTPException(400, {
            message: "Invitation is not active, contact admin for support.",
          });
        }

        // Check if user already exists with this email
        const { data: existingUser } = await supabase.auth.admin.listUsers();
        const userExists = existingUser.users.find(
          (u) => u.email === payload.email,
        );

        // Return success - account creation will happen via Supabase OTP flow
        // and invitation processing will occur in /auth/process-invitation after login
        return c.json({
          success: true,
          message: userExists
            ? "Invitation accepted! Please sign in to continue."
            : "Invitation accepted! Please sign in to create your account.",
          assessmentId: payload.assessmentId,
          accountExists: !!userExists,
          email: payload.email,
        });
      } catch (error) {
        console.error("Error accepting invitation:", error);
        if (error instanceof HTTPException) throw error;
        if (error instanceof Error && error.message.includes("expired")) {
          throw new HTTPException(400, {
            message: "Invitation link has expired",
          });
        }
        throw new HTTPException(500, {
          message:
            error instanceof Error
              ? error.message
              : "Failed to accept invitation",
        });
      }
    },
  );
