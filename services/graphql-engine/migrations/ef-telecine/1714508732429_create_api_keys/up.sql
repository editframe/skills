
CREATE TABLE identity.api_keys (
    key VARCHAR(255) PRIMARY KEY,
    token VARCHAR(255) NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id UUID REFERENCES identity.users(id)
);

alter table "identity"."api_keys" add column "expired_at" date
 not null;

alter table "identity"."api_keys" add column "name" text
 not null;

alter table "identity"."api_keys" add column "org_id" uuid
 not null;

alter table "identity"."api_keys"
  add constraint "api_keys_org_id_fkey"
  foreign key ("org_id")
  references "identity"."orgs"
  ("id") on update restrict on delete cascade;

CREATE OR REPLACE FUNCTION generate_api_key()
RETURNS TEXT AS
$$
DECLARE
    _api_key TEXT;
BEGIN
    -- Generate a UUID using uuid_generate_v4()
    SELECT uuid_generate_v4()::TEXT INTO _api_key;

    -- Return the generated API key
    RETURN _api_key;
END;
$$
LANGUAGE plpgsql;

alter table "identity"."api_keys" alter column "key" set default generate_api_key();




CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

ALTER TABLE "identity"."api_keys" ALTER COLUMN "expired_at" drop default;

DROP FUNCTION IF EXISTS generate_expiry_date();

CREATE OR REPLACE FUNCTION generate_expiry_date()
RETURNS TIMESTAMP AS
$$
DECLARE
    _expiry_date TIMESTAMP;
BEGIN
    -- Calculate the expiration date 90 days from the current date and time
    _expiry_date := CURRENT_TIMESTAMP + INTERVAL '90 days';

    -- Return the generated expiration date with time
    RETURN _expiry_date;
END;
$$
LANGUAGE plpgsql;

alter table "identity"."api_keys" alter column "expired_at" set default generate_expiry_date();

alter table "identity"."api_keys" rename column "key" to "id";

alter table "identity"."api_keys" add column "salt" bytea
 not null;

alter table "identity"."api_keys" add column "hash" bytea
 not null;

ALTER TABLE "identity"."api_keys" ALTER COLUMN "token" drop default;
