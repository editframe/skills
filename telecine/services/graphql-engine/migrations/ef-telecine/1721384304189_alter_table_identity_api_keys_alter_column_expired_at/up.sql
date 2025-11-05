ALTER TABLE "identity"."api_keys" ALTER COLUMN "expired_at" drop default;
alter table "identity"."api_keys" alter column "expired_at" drop not null;
