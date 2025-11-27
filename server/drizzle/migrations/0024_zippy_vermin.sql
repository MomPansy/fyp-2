ALTER TABLE "submission_details" RENAME COLUMN "assignment_problem_id" TO "assessment_problem_id";
ALTER TABLE "submission_details" DROP CONSTRAINT "submission_details_assignment_problem_id_assessment_problems_id_fk";

ALTER TABLE "submission_details" ADD CONSTRAINT "submission_details_assessment_problem_id_assessment_problems_id_fk" FOREIGN KEY ("assessment_problem_id") REFERENCES "public"."assessment_problems"("id") ON DELETE cascade ON UPDATE no action;