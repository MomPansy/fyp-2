CREATE TABLE "assessment_student_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_id" uuid NOT NULL,
	"email" text NOT NULL,
	"matriculation_number" text NOT NULL,
	"full_name" text NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now(),
	"archived_at" timestamp (3) with time zone
);

ALTER TABLE "assessment_student_invitations" ADD CONSTRAINT "assessment_student_invitations_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE cascade ON UPDATE no action;