CREATE TYPE "public"."dialects" AS ENUM('mysql', 'postgres', 'sqlite', 'sqlserver', 'oracle');
ALTER TABLE "problems" ADD COLUMN "dialect" "dialects" DEFAULT 'postgres' NOT NULL;
ALTER TABLE "submission_details" ADD COLUMN "dialect" "dialects" DEFAULT 'postgres' NOT NULL;
ALTER TABLE "user_problems" ADD COLUMN "dialect" "dialects" DEFAULT 'postgres' NOT NULL;
ALTER TABLE "submissions" DROP COLUMN "score";