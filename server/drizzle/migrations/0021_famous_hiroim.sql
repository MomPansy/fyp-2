ALTER TABLE "assessment_student_invitations" ADD COLUMN "invitation_token" text;
ALTER TABLE "assessment_student_invitations" ADD COLUMN "redeemed_at" timestamp (3) with time zone;
ALTER TABLE "assessment_student_invitations" ADD CONSTRAINT "assessment_student_invitations_invitation_token_unique" UNIQUE("invitation_token");