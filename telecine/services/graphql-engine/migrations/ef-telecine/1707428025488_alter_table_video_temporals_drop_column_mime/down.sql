comment on column "video"."temporals"."mime" is E'Bulk storage for assets';
alter table "video"."temporals" alter column "mime" drop not null;
alter table "video"."temporals" add column "mime" text;
