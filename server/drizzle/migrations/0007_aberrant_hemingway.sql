CREATE TABLE "problem_user_tables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"problem_id" uuid NOT NULL,
	"table_name" text NOT NULL,
	"data_path" text NOT NULL,
	"column_types" jsonb,
	"relations" jsonb,
	"number_of_rows" integer,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "problems" ALTER COLUMN "answer" SET DATA TYPE text;
ALTER TABLE "user_problems" ALTER COLUMN "answer" SET DATA TYPE text;
ALTER TABLE "problem_user_tables" ADD CONSTRAINT "problem_user_tables_user_problem_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."user_problems"("id") ON DELETE no action ON UPDATE no action;