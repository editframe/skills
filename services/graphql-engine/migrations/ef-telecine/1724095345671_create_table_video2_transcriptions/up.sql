CREATE TABLE "video2"."transcriptions" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" Timestamp NOT NULL DEFAULT now(), "creator_id" uuid NOT NULL, "org_id" uuid NOT NULL, "api_key_id" uuid NOT NULL, "work_slice_ms" integer NOT NULL, PRIMARY KEY ("id") );COMMENT ON TABLE "video2"."transcriptions" IS E'Table representing transcription jobs';
CREATE OR REPLACE FUNCTION "video2"."set_current_timestamp_updated_at"()
RETURNS TRIGGER AS $$
DECLARE
  _new record;
BEGIN
  _new := NEW;
  _new."updated_at" = NOW();
  RETURN _new;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "set_video2_transcriptions_updated_at"
BEFORE UPDATE ON "video2"."transcriptions"
FOR EACH ROW
EXECUTE PROCEDURE "video2"."set_current_timestamp_updated_at"();
COMMENT ON TRIGGER "set_video2_transcriptions_updated_at" ON "video2"."transcriptions"
IS 'trigger to set value of column "updated_at" to current timestamp on row update';
CREATE EXTENSION IF NOT EXISTS pgcrypto;
