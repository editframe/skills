alter table "identity"."email_confirmations" alter column "token" drop not null;
alter table "identity"."email_confirmations" add column "token" text;
