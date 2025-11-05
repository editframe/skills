comment on column "video2"."unprocessed_files"."processes" is E'Table to track unprocessed media uploads.';
alter table "video2"."unprocessed_files" alter column "processes" drop not null;
alter table "video2"."unprocessed_files" add column "processes" _text;
