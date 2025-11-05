alter table "identity"."api_keys" alter column "signing_secret_salt" drop not null;
alter table "identity"."api_keys" add column "signing_secret_salt" bytea;
