alter table "identity"."api_keys" alter column "webhook_events" drop not null;
ALTER TABLE "identity"."api_keys" ALTER COLUMN "webhook_events" drop default;
ALTER TABLE "identity"."api_keys" ALTER COLUMN "webhook_events" TYPE ARRAY;
