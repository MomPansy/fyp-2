ALTER TABLE "student_assessments" DROP CONSTRAINT "unique_student_assessment_datetime";
ALTER TABLE "assessment_student_invitations" ADD COLUMN "active" boolean DEFAULT false NOT NULL;
ALTER TABLE "assessments" ADD COLUMN "date_time_scheduled" timestamp (3) with time zone;
ALTER TABLE "users" ADD COLUMN "matriculation_number" text;
ALTER TABLE "users" ADD COLUMN "full_name" text;
ALTER TABLE "student_assessments" DROP COLUMN "date_time_scheduled";
ALTER TABLE "student_assessments" ADD CONSTRAINT "unique_student_assessment_datetime" UNIQUE("student_id","assessment_id");