alter table "identity"."api_keys" alter column "signing_secret_hash" drop not null;
alter table "identity"."api_keys" add column "signing_secret_hash" bytea;
