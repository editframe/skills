CREATE TABLE "identity"."tokens" ("token" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), "claimed_at" timestamptz NOT NULL, "email_address" text NOT NULL, PRIMARY KEY ("token","email_address") , FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON UPDATE restrict ON DELETE restrict);COMMENT ON TABLE "identity"."tokens" IS E'A table for email magic links ';
CREATE OR REPLACE FUNCTION "identity"."set_current_timestamp_updated_at"()
RETURNS TRIGGER AS $$
DECLARE
  _new record;
BEGIN
  _new := NEW;
  _new."updated_at" = NOW();
  RETURN _new;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "set_identity_tokens_updated_at"
BEFORE UPDATE ON "identity"."tokens"
FOR EACH ROW
EXECUTE PROCEDURE "identity"."set_current_timestamp_updated_at"();
COMMENT ON TRIGGER "set_identity_tokens_updated_at" ON "identity"."tokens"
IS 'trigger to set value of column "updated_at" to current timestamp on row update';
CREATE EXTENSION IF NOT EXISTS pgcrypto;
