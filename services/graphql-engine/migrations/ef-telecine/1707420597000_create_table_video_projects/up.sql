CREATE TABLE "video"."projects" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), "creator_id" uuid NOT NULL, "org_id" UUID NOT NULL, "title" text NOT NULL DEFAULT '""', PRIMARY KEY ("id") , FOREIGN KEY ("creator_id") REFERENCES "identity"."users"("id") ON UPDATE restrict ON DELETE restrict, FOREIGN KEY ("org_id") REFERENCES "identity"."orgs"("id") ON UPDATE restrict ON DELETE restrict);COMMENT ON TABLE "video"."projects" IS E'Video timeline projects';
CREATE OR REPLACE FUNCTION "video"."set_current_timestamp_updated_at"()
RETURNS TRIGGER AS $$
DECLARE
  _new record;
BEGIN
  _new := NEW;
  _new."updated_at" = NOW();
  RETURN _new;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "set_video_projects_updated_at"
BEFORE UPDATE ON "video"."projects"
FOR EACH ROW
EXECUTE PROCEDURE "video"."set_current_timestamp_updated_at"();
COMMENT ON TRIGGER "set_video_projects_updated_at" ON "video"."projects"
IS 'trigger to set value of column "updated_at" to current timestamp on row update';
CREATE EXTENSION IF NOT EXISTS pgcrypto;
