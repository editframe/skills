comment on column "identity"."users"."email_address" is E'Table of registered users.';
alter table "identity"."users" add constraint "users_email_address_key" unique (email_address);
alter table "identity"."users" alter column "email_address" drop not null;
alter table "identity"."users" add column "email_address" text;
