comment on column "video2"."renders"."failure_text" is E'Resource tracking for renders';
alter table "video2"."renders" alter column "failure_text" drop not null;
alter table "video2"."renders" add column "failure_text" text;
