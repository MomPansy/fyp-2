CREATE TABLE "student_assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now(),
	"archived_at" timestamp (3) with time zone,
	"date_time_scheduled" timestamp (3) with time zone NOT NULL,
	"assessment_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	CONSTRAINT "unique_student_assessment_datetime" UNIQUE("student_id","assessment_id","date_time_scheduled")
);

ALTER TABLE "student_assessments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "submissions" DROP CONSTRAINT "submissions_user_id_users_id_fk";

ALTER TABLE "submissions" DROP CONSTRAINT "submissions_assessment_id_assessments_id_fk";

ALTER TABLE "submissions" ADD COLUMN "student_assessment_id" uuid NOT NULL;
ALTER TABLE "student_assessments" ADD CONSTRAINT "student_assessments_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "student_assessments" ADD CONSTRAINT "student_assessments_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_student_assessment_id_student_assessments_id_fk" FOREIGN KEY ("student_assessment_id") REFERENCES "public"."student_assessments"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "submissions" DROP COLUMN "user_id";
ALTER TABLE "submissions" DROP COLUMN "assessment_id";
CREATE POLICY "student_role_policy" ON "student_assessments" AS PERMISSIVE FOR ALL TO public USING (EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = student_id 
    AND ur.role_id = 'student' 
    AND ur.archived_at IS NULL
  )) WITH CHECK (EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = student_id 
    AND ur.role_id = 'student' 
    AND ur.archived_at IS NULL
  ));