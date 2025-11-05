CREATE TABLE "api"."webhook_events" ("qualified_table" text NOT NULL, "record_id" text NOT NULL, "api_key_id" uuid NOT NULL, "json_payload" text NOT NULL, "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz DEFAULT now(), "delivered_at" timestamptz, "id" uuid NOT NULL DEFAULT gen_random_uuid(), PRIMARY KEY ("id") , FOREIGN KEY ("api_key_id") REFERENCES "identity"."api_keys"("id") ON UPDATE restrict ON DELETE restrict, UNIQUE ("api_key_id", "qualified_table", "record_id"));
CREATE OR REPLACE FUNCTION "api"."set_current_timestamp_updated_at"()
RETURNS TRIGGER AS $$
DECLARE
  _new record;
BEGIN
  _new := NEW;
  _new."updated_at" = NOW();
  RETURN _new;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "set_api_webhook_events_updated_at"
BEFORE UPDATE ON "api"."webhook_events"
FOR EACH ROW
EXECUTE PROCEDURE "api"."set_current_timestamp_updated_at"();
COMMENT ON TRIGGER "set_api_webhook_events_updated_at" ON "api"."webhook_events"
IS 'trigger to set value of column "updated_at" to current timestamp on row update';
CREATE EXTENSION IF NOT EXISTS pgcrypto;
