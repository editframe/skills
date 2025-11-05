
alter table "video"."audio_tracks" alter column "format_data" drop not null;
alter table "video"."audio_tracks" add column "format_data" jsonb;

alter table "video"."video_tracks" alter column "format_data" drop not null;
alter table "video"."video_tracks" add column "format_data" jsonb;

alter table "video"."video_tracks" alter column "type" drop not null;
alter table "video"."video_tracks" add column "type" text;

ALTER TABLE "video"."video_tracks" ALTER COLUMN "id" drop default;

DROP TABLE "video"."video_track_fragments";

ALTER TABLE "video"."video_tracks" ALTER COLUMN "original_container_id" TYPE uuid;

ALTER TABLE "video"."audio_tracks" ALTER COLUMN "original_container_id" TYPE uuid;

comment on column "video"."audio_tracks"."original_container_id" is NULL;

comment on column "video"."video_tracks"."original_container_id" is NULL;

-- Could not auto-generate a down migration.
-- Please write an appropriate down migration for the SQL below:
-- alter table "video"."video_tracks" add column "original_container_id" uuid
--  not null;

-- Could not auto-generate a down migration.
-- Please write an appropriate down migration for the SQL below:
-- alter table "video"."audio_tracks" add column "original_container_id" uuid
--  not null;

-- Could not auto-generate a down migration.
-- Please write an appropriate down migration for the SQL below:
-- DROP table "video"."temporals";

alter table "video"."video_tracks" drop constraint "video_tracks_creator_id_fkey";

alter table "video"."video_tracks" drop constraint "video_tracks_project_id_fkey";

-- Could not auto-generate a down migration.
-- Please write an appropriate down migration for the SQL below:
-- alter table "video"."video_tracks" add column "project_id" uuid
--  not null;

-- Could not auto-generate a down migration.
-- Please write an appropriate down migration for the SQL below:
-- alter table "video"."video_tracks" add column "creator_id" uuid
--  not null;

alter table "video"."video_tracks"
  add constraint "video_tracks_temporal_id_fkey"
  foreign key (temporal_id)
  references "video"."temporals"
  (id) on update restrict on delete restrict;
alter table "video"."video_tracks" alter column "temporal_id" drop not null;
alter table "video"."video_tracks" add column "temporal_id" uuid;

alter table "video"."audio_tracks" drop constraint "audio_tracks_creator_id_fkey";

alter table "video"."audio_tracks" drop constraint "audio_tracks_project_id_fkey";

-- Could not auto-generate a down migration.
-- Please write an appropriate down migration for the SQL below:
-- alter table "video"."audio_tracks" add column "creator_id" uuid
--  not null;

-- Could not auto-generate a down migration.
-- Please write an appropriate down migration for the SQL below:
-- alter table "video"."audio_tracks" add column "project_id" uuid
--  not null;

alter table "video"."audio_tracks"
  add constraint "audio_tracks_temporal_id_fkey"
  foreign key (temporal_id)
  references "video"."temporals"
  (id) on update restrict on delete restrict;
alter table "video"."audio_tracks" alter column "temporal_id" drop not null;
alter table "video"."audio_tracks" add column "temporal_id" uuid;

-- Could not auto-generate a down migration.
-- Please write an appropriate down migration for the SQL below:
-- DROP table "video"."uploads";

alter table "video"."audio_tracks"
  add constraint "audio_tracks_upload_id_fkey"
  foreign key (upload_id)
  references "video"."uploads"
  (id) on update restrict on delete restrict;
alter table "video"."audio_tracks" alter column "upload_id" drop not null;
alter table "video"."audio_tracks" add column "upload_id" uuid;

alter table "video"."video_tracks"
  add constraint "video_tracks_id_fkey"
  foreign key ("id")
  references "video"."uploads"
  ("id") on update restrict on delete restrict;

-- Could not auto-generate a down migration.
-- Please write an appropriate down migration for the SQL below:
-- alter table "video"."audio_tracks" add column "complete" boolean
--  not null default 'false';

-- Could not auto-generate a down migration.
-- Please write an appropriate down migration for the SQL below:
-- alter table "video"."audio_tracks" add column "next_byte" integer
--  not null default '0';

alter table "video"."video_tracks" alter column "upload_id" drop not null;
alter table "video"."video_tracks" add column "upload_id" uuid;

-- Could not auto-generate a down migration.
-- Please write an appropriate down migration for the SQL below:
-- alter table "video"."video_tracks" add column "complete" boolean
--  not null default 'false';

-- Could not auto-generate a down migration.
-- Please write an appropriate down migration for the SQL below:
-- alter table "video"."video_tracks" add column "next_byte" integer
--  not null default '0';

alter table "video"."audio_tracks" drop constraint "audio_tracks_upload_id_fkey";

-- Could not auto-generate a down migration.
-- Please write an appropriate down migration for the SQL below:
-- alter table "video"."audio_tracks" add column "upload_id" uuid
--  not null;

alter table "video"."video_tracks" drop constraint "video_tracks_id_fkey";

DROP TABLE "video"."uploads";

-- Could not auto-generate a down migration.
-- Please write an appropriate down migration for the SQL below:
-- alter table "video"."video_tracks" add column "upload_id" uuid
--  not null;

DROP TABLE "video"."audio_tracks";

DROP TABLE "video"."video_tracks";

DROP TABLE "video"."temporals";

-- Could not auto-generate a down migration.
-- Please write an appropriate down migration for the SQL below:
-- DROP table "video"."temporals";

-- Could not auto-generate a down migration.
-- Please write an appropriate down migration for the SQL below:
-- DROP table "video"."temporal_segments";

comment on column "video"."temporal_segments"."samples" is E'Individually addressable segments for a temporal object. Includes sample lookup data in byte array.';
alter table "video"."temporal_segments" alter column "samples" drop not null;
alter table "video"."temporal_segments" add column "samples" bytea;

alter table "video"."temporal_segments" drop constraint "temporal_segments_pkey";
alter table "video"."temporal_segments"
    add constraint "temporal_segments_pkey"
    primary key ("temporal_id");

-- Could not auto-generate a down migration.
-- Please write an appropriate down migration for the SQL below:
-- alter table "video"."temporals" add column "decoder_config" bytea
--  null;

DROP TABLE "video"."temporal_segments";
