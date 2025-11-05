CREATE EXTENSION IF NOT EXISTS pgcrypto;
alter table "identity"."invites" add column "invite_token" uuid
 not null default gen_random_uuid();
