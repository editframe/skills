CREATE TABLE "identity"."passwords" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), "digest" bytea NOT NULL, "user_id" uuid NOT NULL, PRIMARY KEY ("id") , FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON UPDATE restrict ON DELETE cascade, UNIQUE ("user_id"));COMMENT ON TABLE "identity"."passwords" IS E'1-1 connection between users and their passwords.';
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
CREATE TRIGGER "set_identity_passwords_updated_at"
BEFORE UPDATE ON "identity"."passwords"
FOR EACH ROW
EXECUTE PROCEDURE "identity"."set_current_timestamp_updated_at"();
COMMENT ON TRIGGER "set_identity_passwords_updated_at" ON "identity"."passwords"
IS 'trigger to set value of column "updated_at" to current timestamp on row update';
CREATE EXTENSION IF NOT EXISTS pgcrypto;
