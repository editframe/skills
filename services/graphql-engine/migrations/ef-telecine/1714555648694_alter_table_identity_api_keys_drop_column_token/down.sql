alter table "identity"."api_keys" alter column "token" drop not null;
alter table "identity"."api_keys" add column "token" varchar;
