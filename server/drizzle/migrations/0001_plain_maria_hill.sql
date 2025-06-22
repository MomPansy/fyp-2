CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp (3) with time zone
);

ALTER TABLE "user_roles" ADD COLUMN "role_id" uuid NOT NULL;
ALTER TABLE "user_roles" ADD COLUMN "created_by" uuid NOT NULL;
ALTER TABLE "user_roles" ADD COLUMN "updated_by" uuid;
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_created_by_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_updated_by_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "users" DROP COLUMN "workspace_id";
ALTER TABLE "users" DROP COLUMN "name";
ALTER TABLE "users" DROP COLUMN "phone";
ALTER TABLE "users" DROP COLUMN "avatar_url";
ALTER TABLE "user_roles" DROP CONSTRAINT "user_roles_pk";
--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_pk" PRIMARY KEY("user_id","role_id");
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_unique" UNIQUE("user_id","role_id");