import { zValidator } from "@hono/zod-validator";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { decodeJwt } from "jose";

import { factory } from "../../factory.ts";
import { supabase } from "../../lib/supabase.ts";
import {
  signInvitationToken,
  getInvitationExpiration,
  generateInvitationUrl,
  verifyInvitationToken,
  invitationTokenPayloadSchema,
} from "../../lib/invitation-jwt.ts";
import { sendInvitationEmail } from "../../lib/mailer.ts";
import { drizzle } from "server/middlewares/drizzle.ts";
import { assessmentStudentInvitations } from "server/drizzle/assessment_student_invitations.ts";
import { assessments } from "server/drizzle/assessments.ts";
import { getAssessmentTimingStatus } from "server/lib/assessment-utils.ts";

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

        if (assessment.archivedAt) {
          throw new HTTPException(403, {
            message:
              "Cannot send invitations for a cancelled assessment. Please restore it first.",
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
      let isTokenExpired = false;
      let payload;

      try {
        const token = c.req.param("token");

        // Try to verify token normally
        try {
          payload = await verifyInvitationToken(token);
        } catch (verifyError) {
          // If token is expired, decode it without verification to get the invitation ID
          if (
            verifyError instanceof Error &&
            verifyError.message.includes("expired")
          ) {
            isTokenExpired = true;
            const decoded = decodeJwt(token);
            payload = invitationTokenPayloadSchema.parse(decoded);
          } else {
            throw verifyError;
          }
        }

        const { data: invitation, error: invitationError } = await supabase
          .from("assessment_student_invitations")
          .select("*, assessments(*)")
          .eq("id", payload.invitationId)
          .single();

        if (invitationError) {
          throw new HTTPException(404, { message: "Invitation not found" });
        }

        if (!invitation.active) {
          return c.json(
            {
              success: false,
              error: "invitation_not_active",
              message:
                "This invitation is no longer active. If you already have an account, please sign in directly.",
              assessmentTitle: invitation.assessments.name,
              assessmentId: payload.assessmentId,
            },
            400,
          );
        }

        // Use shared utility for timing status calculation
        const timing = getAssessmentTimingStatus(
          invitation.assessments.date_time_scheduled,
          invitation.assessments.duration,
        );
        const hasAssessmentEnded = timing.status === "ended";

        // If token is expired but assessment has ended, return assessment ended status
        if (isTokenExpired && hasAssessmentEnded) {
          return c.json(
            {
              success: false,
              error: "assessment_ended",
              message: "This assessment has ended",
              assessmentTitle: invitation.assessments.name,
              assessmentDate: invitation.assessments.date_time_scheduled,
              assessmentEndDate: timing.endDate?.toISOString(),
            },
            410, // 410 Gone - resource existed but is no longer available
          );
        }

        // If token is expired but assessment is still active, return token expired error
        if (isTokenExpired) {
          return c.json(
            {
              success: false,
              error: "token_expired",
              message:
                "Your invitation link has expired. If you already have an account, please sign in directly.",
              assessmentTitle: invitation.assessments.name,
              assessmentId: payload.assessmentId,
            },
            400,
          );
        }

        // Token is valid - return invitation details
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
