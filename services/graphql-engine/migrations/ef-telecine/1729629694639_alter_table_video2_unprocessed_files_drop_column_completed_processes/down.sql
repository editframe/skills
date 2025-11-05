comment on column "video2"."unprocessed_files"."completed_processes" is E'Table to track unprocessed media uploads.';
alter table "video2"."unprocessed_files" alter column "completed_processes" set default '{}'::text[];
alter table "video2"."unprocessed_files" alter column "completed_processes" drop not null;
alter table "video2"."unprocessed_files" add column "completed_processes" _text;
