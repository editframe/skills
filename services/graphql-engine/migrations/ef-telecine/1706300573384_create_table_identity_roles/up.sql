CREATE TABLE "identity"."roles" ("id" serial NOT NULL, "role" text NOT NULL, PRIMARY KEY ("id") , UNIQUE ("role"));COMMENT ON TABLE "identity"."roles" IS E'Roles for users in their organization';
