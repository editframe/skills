
alter table "api"."webhooks_requests" drop constraint "webhooks_requests_org_id_fkey";

-- Could not auto-generate a down migration.
-- Please write an appropriate down migration for the SQL below:
-- alter table "api"."webhooks_requests" add column "org_id" uuid
--  not null;

alter table "api"."webhooks_requests" alter column "render_id" set not null;

alter table "api"."webhooks_requests" rename column "last_attempted_at" to "last_retried";
ALTER TABLE "api"."webhooks_requests" ALTER COLUMN "last_retried" TYPE timestamp without time zone;

alter table "api"."webhooks_requests" drop constraint "webhooks_requests_render_id_fkey";

alter table "api"."webhooks_requests" drop constraint "webhooks_requests_api_key_id_fkey";

-- Could not auto-generate a down migration.
-- Please write an appropriate down migration for the SQL below:
-- CREATE TABLE api.webhooks_requests (
--     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
--     api_key_id CHARACTER VARYING NOT NULL,
--     status_code INTEGER NOT NULL,
--     render_id UUID NOT NULL,
--     created_at TIMESTAMP DEFAULT now(),
--     retry_count INTEGER DEFAULT 0,
--     last_retried TIMESTAMP
-- );
