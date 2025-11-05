CREATE TABLE "video"."renders" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), "snapshot" json NOT NULL, PRIMARY KEY ("id") );COMMENT ON TABLE "video"."renders" IS E'Table to track renderable snapshots. WIP: we may switch to other schema later, this is just scaffolding to prove things out in production.';
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
CREATE TRIGGER "set_video_renders_updated_at"
BEFORE UPDATE ON "video"."renders"
FOR EACH ROW
EXECUTE PROCEDURE "video"."set_current_timestamp_updated_at"();
COMMENT ON TRIGGER "set_video_renders_updated_at" ON "video"."renders"
IS 'trigger to set value of column "updated_at" to current timestamp on row update';
CREATE EXTENSION IF NOT EXISTS pgcrypto;
