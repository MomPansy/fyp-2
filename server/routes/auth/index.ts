import { zValidator } from "@hono/zod-validator";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";

import { factory } from "server/factory.ts";
import { supabase } from "server/lib/supabase.ts";
import { auth } from "server/middlewares/auth.ts";

const processInvitationSchema = z.object({
  email: z.string().email(),
});

export const route = factory
  .createApp()
  .post(
    "/process-invitation",
    auth(),
    zValidator("json", processInvitationSchema),
    async (c) => {
      const jwtPayload = c.get("jwtPayload");
      if (!jwtPayload) {
        throw new HTTPException(401, {
          message: "Unauthorized",
        });
      }

      const { email } = c.req.valid("json");
      const userId = jwtPayload.user_metadata.user_id;

      try {
        // Fetch pending invitations
        const { data: invitation, error: invitationError } = await supabase
          .from("assessment_student_invitations")
          .select("*")
          .eq("email", email)
          .is("archived_at", null);

        if (invitationError) {
          console.error("Error fetching invitations:", invitationError);
          throw new HTTPException(500, {
            message: "Failed to fetch invitations",
          });
        }

        if (invitation.length === 0) {
          console.warn(`No invitation found for email: ${email}`);
          return;
        }

        const invitee = invitation[0];

        // Update user information
        const { data: userData, error: userUpsertError } = await supabase
          .from("users")
          .update({
            email: email,
            full_name: invitee.full_name,
            matriculation_number: invitee.matriculation_number,
          })
          .eq("auth_user_id", userId)
          .select()
          .single();

        if (userUpsertError) {
          console.error("Error updating user:", userUpsertError);
          throw new HTTPException(500, {
            message: "Failed to update user information",
          });
        }

        // Archive invitations
        const { error: archiveError } = await supabase
          .from("assessment_student_invitations")
          .update({ archived_at: new Date().toISOString() })
          .in(
            "id",
            invitation.map((inv) => inv.id),
          );

        if (archiveError) {
          console.error("Error archiving invitations:", archiveError);
          throw new HTTPException(500, {
            message: "Failed to archive invitations",
          });
        }

        // Create student assessment records
        const assessments = invitation.map((inv) => inv.assessment_id);
        const { error: studentAssessmentError } = await supabase
          .from("student_assessments")
          .upsert(
            assessments.map((assessment_id) => ({
              assessment_id,
              student_id: userData.id,
            })),
          );

        if (studentAssessmentError) {
          console.error(
            "Error creating student assessments:",
            studentAssessmentError,
          );
          throw new HTTPException(500, {
            message: "Failed to create student assessments",
          });
        }

        console.info(
          `Successfully processed invitation for user ${userId} (${email})`,
        );

        return c.json({
          assessments: assessments.map((id) => ({ id })),
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
    },
  );
