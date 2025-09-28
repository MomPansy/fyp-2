CREATE TABLE "submission_details" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_id" uuid NOT NULL,
	"assignment_problem_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp (3) with time zone,
	"candidate_answer" text NOT NULL,
	"grade" "citext" DEFAULT 'failed' NOT NULL
);

CREATE TABLE "submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp (3) with time zone,
	"score" numeric NOT NULL,
	"assessment_id" uuid NOT NULL
);

ALTER TABLE "assessmentProblems" DROP CONSTRAINT "assessmentProblems_problem_id_problems_id_fk";

ALTER TABLE "submission_details" ADD CONSTRAINT "submission_details_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "submission_details" ADD CONSTRAINT "submission_details_assignment_problem_id_assessmentProblems_id_fk" FOREIGN KEY ("assignment_problem_id") REFERENCES "public"."assessmentProblems"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "assessmentProblems" ADD CONSTRAINT "assessmentProblems_problem_id_user_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."user_problems"("id") ON DELETE cascade ON UPDATE no action;