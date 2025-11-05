CREATE TABLE "identity"."email_confirmations" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), "confirmed_at" timetz, "user_id" uuid NOT NULL, "token" text NOT NULL, PRIMARY KEY ("id") , FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON UPDATE restrict ON DELETE cascade);
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
CREATE TRIGGER "set_identity_email_confirmations_updated_at"
BEFORE UPDATE ON "identity"."email_confirmations"
FOR EACH ROW
EXECUTE PROCEDURE "identity"."set_current_timestamp_updated_at"();
COMMENT ON TRIGGER "set_identity_email_confirmations_updated_at" ON "identity"."email_confirmations"
IS 'trigger to set value of column "updated_at" to current timestamp on row update';
CREATE EXTENSION IF NOT EXISTS pgcrypto;
