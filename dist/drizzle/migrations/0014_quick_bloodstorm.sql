ALTER TABLE "assessmentProblems" RENAME TO "assessment_problems";
ALTER TABLE "assessment_problems" DROP CONSTRAINT "assessmentProblems_assessment_id_assessments_id_fk";

ALTER TABLE "assessment_problems" DROP CONSTRAINT "assessmentProblems_problem_id_user_problems_id_fk";

ALTER TABLE "submission_details" DROP CONSTRAINT "submission_details_assignment_problem_id_assessmentProblems_id_fk";

ALTER TABLE "assessment_problems" ADD CONSTRAINT "assessment_problems_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "assessment_problems" ADD CONSTRAINT "assessment_problems_problem_id_user_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."user_problems"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "submission_details" ADD CONSTRAINT "submission_details_assignment_problem_id_assessment_problems_id_fk" FOREIGN KEY ("assignment_problem_id") REFERENCES "public"."assessment_problems"("id") ON DELETE cascade ON UPDATE no action;