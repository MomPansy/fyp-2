CREATE TABLE "problem_tables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"problem_id" uuid NOT NULL,
	"table_name" text NOT NULL,
	"ddl_script" text NOT NULL,
	"data_path" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "problems" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"answer" jsonb,
	"created_at" timestamp (3) with time zone,
	"updated_at" timestamp (3) with time zone,
	"archived_at" timestamp (3) with time zone
);

CREATE TABLE "user_problems" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"problem_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"answer" jsonb,
	"created_at" timestamp (3) with time zone DEFAULT now(),
	"updated_at" timestamp (3) with time zone DEFAULT now(),
	"archived_at" timestamp (3) with time zone
);

ALTER TABLE "problem_tables" ADD CONSTRAINT "problem_tables_problem_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."problems"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "user_problems" ADD CONSTRAINT "user_problems_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_problems" ADD CONSTRAINT "user_problems_problem_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."problems"("id") ON DELETE cascade ON UPDATE no action;