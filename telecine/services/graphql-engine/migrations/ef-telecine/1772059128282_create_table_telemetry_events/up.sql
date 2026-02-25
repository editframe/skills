CREATE SCHEMA IF NOT EXISTS telemetry;

CREATE TABLE "telemetry"."events" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "org_id" uuid NOT NULL,
  "api_key_id" uuid NOT NULL,
  "render_path" text NOT NULL,
  "duration_ms" integer,
  "width" integer,
  "height" integer,
  "fps" numeric,
  "feature_usage" jsonb NOT NULL DEFAULT '{}',
  "ip_address" text,
  "origin" text,
  "sdk_version" text,
  "cli_version" text,
  PRIMARY KEY ("id"),
  FOREIGN KEY ("org_id") REFERENCES "identity"."orgs"("id") ON UPDATE restrict ON DELETE restrict,
  FOREIGN KEY ("api_key_id") REFERENCES "identity"."api_keys"("id") ON UPDATE restrict ON DELETE restrict
);

COMMENT ON TABLE "telemetry"."events" IS E'SDK render telemetry events (client-side, CLI, and server-side renders)';

CREATE INDEX ON "telemetry"."events" ("org_id");
CREATE INDEX ON "telemetry"."events" ("api_key_id");
CREATE INDEX ON "telemetry"."events" ("created_at");
CREATE INDEX ON "telemetry"."events" ("render_path");
