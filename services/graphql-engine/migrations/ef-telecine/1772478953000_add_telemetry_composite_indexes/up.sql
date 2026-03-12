CREATE INDEX ON "telemetry"."events" ("event_type", "created_at" DESC);
CREATE INDEX ON "telemetry"."events" ("org_id" NULLS LAST, "created_at" DESC);
