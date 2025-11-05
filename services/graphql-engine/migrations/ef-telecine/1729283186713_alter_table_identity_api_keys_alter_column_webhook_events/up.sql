ALTER TABLE "identity"."api_keys" ALTER COLUMN "webhook_events" TYPE text[];
alter table "identity"."api_keys" alter column "webhook_events" set default '{}';
alter table "identity"."api_keys" alter column "webhook_events" set not null;
