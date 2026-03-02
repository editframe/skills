-- Allow anonymous events (no API key required)
ALTER TABLE "telemetry"."events"
  ALTER COLUMN "org_id" DROP NOT NULL,
  ALTER COLUMN "api_key_id" DROP NOT NULL,
  ALTER COLUMN "render_path" DROP NOT NULL;

-- Remove FK constraints so null values are accepted
ALTER TABLE "telemetry"."events"
  DROP CONSTRAINT "events_org_id_fkey",
  DROP CONSTRAINT "events_api_key_id_fkey";

-- Re-add FKs as deferrable, allowing nulls
ALTER TABLE "telemetry"."events"
  ADD CONSTRAINT "events_org_id_fkey"
    FOREIGN KEY ("org_id") REFERENCES "identity"."orgs"("id") ON UPDATE restrict ON DELETE restrict,
  ADD CONSTRAINT "events_api_key_id_fkey"
    FOREIGN KEY ("api_key_id") REFERENCES "identity"."api_keys"("id") ON UPDATE restrict ON DELETE restrict;

-- Add event_type to distinguish render vs load events
ALTER TABLE "telemetry"."events"
  ADD COLUMN "event_type" text NOT NULL DEFAULT 'render';

CREATE INDEX ON "telemetry"."events" ("event_type");

COMMENT ON TABLE "telemetry"."events" IS E'SDK telemetry events (renders and composition loads, authenticated or anonymous)';
