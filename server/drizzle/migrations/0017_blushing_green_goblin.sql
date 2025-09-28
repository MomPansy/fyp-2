ALTER TABLE "assessment_problems" ALTER COLUMN "updated_at" DROP NOT NULL;
ALTER TABLE "assessments" ALTER COLUMN "updated_at" DROP NOT NULL;
ALTER TABLE "problem_tables" ALTER COLUMN "updated_at" DROP NOT NULL;
ALTER TABLE "problems" ALTER COLUMN "updated_at" DROP NOT NULL;
ALTER TABLE "submission_details" ALTER COLUMN "updated_at" DROP NOT NULL;
ALTER TABLE "submissions" ALTER COLUMN "updated_at" DROP NOT NULL;
ALTER TABLE "user_problem_tables" ALTER COLUMN "updated_at" DROP NOT NULL;
ALTER TABLE "user_problems" ALTER COLUMN "updated_at" DROP NOT NULL;