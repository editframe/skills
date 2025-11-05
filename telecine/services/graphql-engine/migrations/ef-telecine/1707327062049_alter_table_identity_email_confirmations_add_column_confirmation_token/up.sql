alter table "identity"."email_confirmations" add column "confirmation_token" text
 not null unique default gen_random_uuid();
