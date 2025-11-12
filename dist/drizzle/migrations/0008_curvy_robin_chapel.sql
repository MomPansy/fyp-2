ALTER TABLE "problem_user_tables" RENAME TO "user_problem_tables";
ALTER TABLE "user_problem_tables" DROP CONSTRAINT "problem_user_tables_user_problem_id_fk";

ALTER TABLE "user_problem_tables" ADD CONSTRAINT "problem_user_tables_user_problem_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."user_problems"("id") ON DELETE no action ON UPDATE no action;