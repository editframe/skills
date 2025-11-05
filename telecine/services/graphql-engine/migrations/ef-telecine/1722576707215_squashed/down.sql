
-- Could not auto-generate a down migration.
-- Please write an appropriate down migration for the SQL below:
-- alter table "video2"."unprocessed_files" add column "completed_processes" text[]
--  not null default '{}';

comment on column "video2"."isobmff_files"."tracks_complete" is E'Files in isobmff fragment format. Id is an md5 hash of the original souce file.';
alter table "video2"."isobmff_files" alter column "tracks_complete" drop not null;
alter table "video2"."isobmff_files" add column "tracks_complete" bool;

-- Could not auto-generate a down migration.
-- Please write an appropriate down migration for the SQL below:
-- alter table "video2"."isobmff_files" add column "tracks_complete" boolean
--  null;
