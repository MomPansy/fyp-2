CREATE TABLE "roles" (
	"id" "citext" PRIMARY KEY NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp (3) with time zone
);

CREATE TABLE "user_roles" (
	"user_id" uuid NOT NULL,
	"role_id" "citext" NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp (3) with time zone DEFAULT now(),
	"updated_by" uuid,
	"archived_at" timestamp (3) with time zone,
	CONSTRAINT "user_roles_pk" PRIMARY KEY("user_id","role_id"),
	CONSTRAINT "user_roles_unique" UNIQUE("user_id","role_id")
);

CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_user_id" uuid NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp (3) with time zone,
	"email" text,
	CONSTRAINT "users_auth_user_id_unique" UNIQUE("auth_user_id")
);

ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_created_by_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_updated_by_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX "users_auth_user_id_idx" ON "users" USING btree ("auth_user_id");