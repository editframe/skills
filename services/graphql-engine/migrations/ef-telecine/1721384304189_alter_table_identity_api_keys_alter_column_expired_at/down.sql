alter table "identity"."api_keys" alter column "expired_at" set not null;
alter table "identity"."api_keys" alter column "expired_at" set default generate_expiry_date();
