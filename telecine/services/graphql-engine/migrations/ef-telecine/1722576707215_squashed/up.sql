
alter table "video2"."isobmff_files" add column "tracks_complete" boolean
 null;

alter table "video2"."isobmff_files" drop column "tracks_complete" cascade;

alter table "video2"."unprocessed_files" add column "completed_processes" text[]
 not null default '{}';
