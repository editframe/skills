CREATE TABLE "identity"."invites" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), "accepted_at" timestamptz, "denied_at" timestamptz, "email_address" Text NOT NULL, "org_id" uuid NOT NULL, "role" text NOT NULL DEFAULT 'editor', "creator_id" UUID NOT NULL, PRIMARY KEY ("id") , FOREIGN KEY ("org_id") REFERENCES "identity"."orgs"("id") ON UPDATE restrict ON DELETE restrict, FOREIGN KEY ("creator_id") REFERENCES "identity"."users"("id") ON UPDATE restrict ON DELETE restrict, FOREIGN KEY ("role") REFERENCES "identity"."roles"("id") ON UPDATE restrict ON DELETE restrict, UNIQUE ("org_id", "email_address"));COMMENT ON TABLE "identity"."invites" IS E'Invitations for users to join orgs';
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
CREATE TRIGGER "set_identity_invites_updated_at"
BEFORE UPDATE ON "identity"."invites"
FOR EACH ROW
EXECUTE PROCEDURE "identity"."set_current_timestamp_updated_at"();
COMMENT ON TRIGGER "set_identity_invites_updated_at" ON "identity"."invites"
IS 'trigger to set value of column "updated_at" to current timestamp on row update';
CREATE EXTENSION IF NOT EXISTS pgcrypto;
