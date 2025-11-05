CREATE TABLE "identity"."password_resets" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), "user_id" uuid NOT NULL, "reset_token" uuid NOT NULL DEFAULT gen_random_uuid(), "claimed_at" timestamptz NOT NULL, PRIMARY KEY ("id") , FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON UPDATE restrict ON DELETE cascade);COMMENT ON TABLE "identity"."password_resets" IS E'Tokens for users to reset their passwords';
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
CREATE TRIGGER "set_identity_password_resets_updated_at"
BEFORE UPDATE ON "identity"."password_resets"
FOR EACH ROW
EXECUTE PROCEDURE "identity"."set_current_timestamp_updated_at"();
COMMENT ON TRIGGER "set_identity_password_resets_updated_at" ON "identity"."password_resets"
IS 'trigger to set value of column "updated_at" to current timestamp on row update';
CREATE EXTENSION IF NOT EXISTS pgcrypto;
