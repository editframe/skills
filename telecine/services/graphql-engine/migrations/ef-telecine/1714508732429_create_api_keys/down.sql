
alter table "identity"."api_keys" alter column "token" set default generate_token();

-- Could not auto-generate a down migration.
-- Please write an appropriate down migration for the SQL below:
-- alter table "identity"."api_keys" add column "hash" bytea
--  not null;

-- Could not auto-generate a down migration.
-- Please write an appropriate down migration for the SQL below:
-- alter table "identity"."api_keys" add column "salt" bytea
--  not null;

alter table "identity"."api_keys" rename column "id" to "key";

ALTER TABLE "identity"."api_keys" ALTER COLUMN "expired_at" drop default;

-- Could not auto-generate a down migration.
-- Please write an appropriate down migration for the SQL below:
-- DROP FUNCTION IF EXISTS generate_expiry_date();
--
-- CREATE OR REPLACE FUNCTION generate_expiry_date()
-- RETURNS TIMESTAMP AS
-- $$
-- DECLARE
--     _expiry_date TIMESTAMP;
-- BEGIN
--     -- Calculate the expiration date 90 days from the current date and time
--     _expiry_date := CURRENT_TIMESTAMP + INTERVAL '90 days';
--
--     -- Return the generated expiration date with time
--     RETURN _expiry_date;
-- END;
-- $$
-- LANGUAGE plpgsql;

alter table "identity"."api_keys" alter column "expired_at" set default generate_expiry_date();

-- Could not auto-generate a down migration.
-- Please write an appropriate down migration for the SQL below:
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

ALTER TABLE "identity"."api_keys" ALTER COLUMN "token" drop default;

-- Could not auto-generate a down migration.
-- Please write an appropriate down migration for the SQL below:
-- CREATE OR REPLACE FUNCTION generate_token()
-- RETURNS TEXT AS
-- $$
-- DECLARE
--     _token TEXT;
-- BEGIN
--     -- Generate a UUID using uuid_generate_v4()
--     SELECT 'ef_' || uuid_generate_v4()::TEXT INTO _token;
--
--     -- Return the generated token
--     RETURN _token;
-- END;
-- $$
-- LANGUAGE plpgsql;

ALTER TABLE "identity"."api_keys" ALTER COLUMN "key" drop default;

-- Could not auto-generate a down migration.
-- Please write an appropriate down migration for the SQL below:
-- CREATE OR REPLACE FUNCTION generate_api_key()
-- RETURNS TEXT AS
-- $$
-- DECLARE
--     _api_key TEXT;
-- BEGIN
--     -- Generate a UUID using uuid_generate_v4()
--     SELECT uuid_generate_v4()::TEXT INTO _api_key;
--
--     -- Return the generated API key
--     RETURN _api_key;
-- END;
-- $$
-- LANGUAGE plpgsql;

alter table "identity"."api_keys" drop constraint "api_keys_org_id_fkey";

-- Could not auto-generate a down migration.
-- Please write an appropriate down migration for the SQL below:
-- alter table "identity"."api_keys" add column "org_id" uuid
--  not null;

-- Could not auto-generate a down migration.
-- Please write an appropriate down migration for the SQL below:
-- alter table "identity"."api_keys" add column "name" text
--  not null;

-- Could not auto-generate a down migration.
-- Please write an appropriate down migration for the SQL below:
-- alter table "identity"."api_keys" add column "expired_at" date
--  not null;

-- Could not auto-generate a down migration.
-- Please write an appropriate down migration for the SQL below:
-- CREATE TABLE identity.api_keys (
--     key VARCHAR(255) PRIMARY KEY,
--     token VARCHAR(255) NOT NULL,
--     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     user_id UUID REFERENCES identity.users(id)
-- );
