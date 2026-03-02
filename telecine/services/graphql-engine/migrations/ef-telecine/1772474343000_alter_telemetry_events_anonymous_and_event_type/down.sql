ALTER TABLE "telemetry"."events" DROP COLUMN "event_type";

ALTER TABLE "telemetry"."events"
  ALTER COLUMN "org_id" SET NOT NULL,
  ALTER COLUMN "api_key_id" SET NOT NULL,
  ALTER COLUMN "render_path" SET NOT NULL;
