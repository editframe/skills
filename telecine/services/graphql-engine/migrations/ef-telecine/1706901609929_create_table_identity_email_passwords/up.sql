CREATE TABLE "identity"."email_passwords" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), "email_address" text NOT NULL, "salt" bytea NOT NULL, "hash" bytea NOT NULL, "user_id" uuid NOT NULL, PRIMARY KEY ("id") , FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON UPDATE restrict ON DELETE cascade, UNIQUE ("email_address"), CONSTRAINT "Email address is lower case" CHECK (email_address = lower(email_address)));COMMENT ON TABLE "identity"."email_passwords" IS E'Pairing of email address and password for users who login with that credential';
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
CREATE TRIGGER "set_identity_email_passwords_updated_at"
BEFORE UPDATE ON "identity"."email_passwords"
FOR EACH ROW
EXECUTE PROCEDURE "identity"."set_current_timestamp_updated_at"();
COMMENT ON TRIGGER "set_identity_email_passwords_updated_at" ON "identity"."email_passwords"
IS 'trigger to set value of column "updated_at" to current timestamp on row update';
CREATE EXTENSION IF NOT EXISTS pgcrypto;
