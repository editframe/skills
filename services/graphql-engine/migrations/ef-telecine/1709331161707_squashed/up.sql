
CREATE TABLE "video"."temporal_segments" ("temporal_id" uuid NOT NULL, "cts" Integer NOT NULL, "offset" integer NOT NULL, "size" integer NOT NULL, "duration" integer NOT NULL, "samples" bytea NOT NULL, PRIMARY KEY ("temporal_id") , FOREIGN KEY ("temporal_id") REFERENCES "video"."temporals"("id") ON UPDATE restrict ON DELETE cascade);COMMENT ON TABLE "video"."temporal_segments" IS E'Individually addressable segments for a temporal object. Includes sample lookup data in byte array.';

alter table "video"."temporals" add column "decoder_config" bytea
 null;

BEGIN TRANSACTION;
ALTER TABLE "video"."temporal_segments" DROP CONSTRAINT "temporal_segments_pkey";

ALTER TABLE "video"."temporal_segments"
    ADD CONSTRAINT "temporal_segments_pkey" PRIMARY KEY ("temporal_id", "offset");
COMMIT TRANSACTION;

alter table "video"."temporal_segments" drop column "samples" cascade;

DROP table "video"."temporal_segments";

DROP table "video"."temporals";

CREATE TABLE "video"."temporals" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), "project_id" uuid NOT NULL, "creator_id" uuid NOT NULL, PRIMARY KEY ("id") , FOREIGN KEY ("project_id") REFERENCES "video"."projects"("id") ON UPDATE restrict ON DELETE restrict, FOREIGN KEY ("creator_id") REFERENCES "identity"."users"("id") ON UPDATE restrict ON DELETE restrict);
CREATE OR REPLACE FUNCTION "video"."set_current_timestamp_updated_at"()
RETURNS TRIGGER AS $$
DECLARE
  _new record;
BEGIN
  _new := NEW;
  _new."updated_at" = NOW();
  RETURN _new;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "set_video_temporals_updated_at"
BEFORE UPDATE ON "video"."temporals"
FOR EACH ROW
EXECUTE PROCEDURE "video"."set_current_timestamp_updated_at"();
COMMENT ON TRIGGER "set_video_temporals_updated_at" ON "video"."temporals"
IS 'trigger to set value of column "updated_at" to current timestamp on row update';
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE "video"."video_tracks" ("id" UUID NOT NULL, "temporal_id" UUID NOT NULL, "type" text NOT NULL, "duration_ms" integer NOT NULL, "format_data" jsonb NOT NULL, "bytesize" integer NOT NULL, "codec" Text NOT NULL, "width" integer NOT NULL, "height" integer NOT NULL, "format" Text NOT NULL, PRIMARY KEY ("id") , FOREIGN KEY ("temporal_id") REFERENCES "video"."temporals"("id") ON UPDATE restrict ON DELETE restrict);

CREATE TABLE "video"."audio_tracks" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "temporal_id" uuid NOT NULL, "duration_ms" integer NOT NULL, "format_data" jsonb NOT NULL, "bytesize" integer NOT NULL, "codec" text NOT NULL, "samplerate" integer NOT NULL, "format" text NOT NULL, "channel_count" integer NOT NULL, PRIMARY KEY ("id") , FOREIGN KEY ("temporal_id") REFERENCES "video"."temporals"("id") ON UPDATE restrict ON DELETE restrict);
CREATE EXTENSION IF NOT EXISTS pgcrypto;

alter table "video"."video_tracks" add column "upload_id" uuid
 not null;

CREATE TABLE "video"."uploads" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), "creator_id" uuid NOT NULL, "original_filename" Text NOT NULL, "next_byte" integer NOT NULL DEFAULT 0, "complete" boolean NOT NULL DEFAULT false, PRIMARY KEY ("id") , FOREIGN KEY ("creator_id") REFERENCES "identity"."users"("id") ON UPDATE restrict ON DELETE restrict);
CREATE OR REPLACE FUNCTION "video"."set_current_timestamp_updated_at"()
RETURNS TRIGGER AS $$
DECLARE
  _new record;
BEGIN
  _new := NEW;
  _new."updated_at" = NOW();
  RETURN _new;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "set_video_uploads_updated_at"
BEFORE UPDATE ON "video"."uploads"
FOR EACH ROW
EXECUTE PROCEDURE "video"."set_current_timestamp_updated_at"();
COMMENT ON TRIGGER "set_video_uploads_updated_at" ON "video"."uploads"
IS 'trigger to set value of column "updated_at" to current timestamp on row update';
CREATE EXTENSION IF NOT EXISTS pgcrypto;

alter table "video"."video_tracks"
  add constraint "video_tracks_id_fkey"
  foreign key ("id")
  references "video"."uploads"
  ("id") on update restrict on delete restrict;

alter table "video"."audio_tracks" add column "upload_id" uuid
 not null;

alter table "video"."audio_tracks"
  add constraint "audio_tracks_upload_id_fkey"
  foreign key ("upload_id")
  references "video"."uploads"
  ("id") on update restrict on delete restrict;

alter table "video"."video_tracks" add column "next_byte" integer
 not null default '0';

alter table "video"."video_tracks" add column "complete" boolean
 not null default 'false';

alter table "video"."video_tracks" drop column "upload_id" cascade;

alter table "video"."audio_tracks" add column "next_byte" integer
 not null default '0';

alter table "video"."audio_tracks" add column "complete" boolean
 not null default 'false';

alter table "video"."video_tracks" drop constraint "video_tracks_id_fkey";

alter table "video"."audio_tracks" drop column "upload_id" cascade;

DROP table "video"."uploads";

alter table "video"."audio_tracks" drop column "temporal_id" cascade;

alter table "video"."audio_tracks" add column "project_id" uuid
 not null;

alter table "video"."audio_tracks" add column "creator_id" uuid
 not null;

alter table "video"."audio_tracks"
  add constraint "audio_tracks_project_id_fkey"
  foreign key ("project_id")
  references "video"."projects"
  ("id") on update restrict on delete restrict;

alter table "video"."audio_tracks"
  add constraint "audio_tracks_creator_id_fkey"
  foreign key ("creator_id")
  references "identity"."users"
  ("id") on update restrict on delete restrict;

alter table "video"."video_tracks" drop column "temporal_id" cascade;

alter table "video"."video_tracks" add column "creator_id" uuid
 not null;

alter table "video"."video_tracks" add column "project_id" uuid
 not null;

alter table "video"."video_tracks"
  add constraint "video_tracks_project_id_fkey"
  foreign key ("project_id")
  references "video"."projects"
  ("id") on update restrict on delete restrict;

alter table "video"."video_tracks"
  add constraint "video_tracks_creator_id_fkey"
  foreign key ("creator_id")
  references "identity"."users"
  ("id") on update restrict on delete restrict;

DROP table "video"."temporals";

alter table "video"."audio_tracks" add column "original_container_id" uuid
 not null;

alter table "video"."video_tracks" add column "original_container_id" uuid
 not null;

comment on column "video"."video_tracks"."original_container_id" is E'A loose reference that will be shared between audio/video tracks that came from the same original container. Will be used if we ever need to re-combine tracks.';

comment on column "video"."audio_tracks"."original_container_id" is E'A loose reference that will be shared between audio/video tracks that came from the same original container. Will be used if we ever need to re-combine tracks.';

ALTER TABLE "video"."audio_tracks" ALTER COLUMN "original_container_id" TYPE text;

ALTER TABLE "video"."video_tracks" ALTER COLUMN "original_container_id" TYPE text;

CREATE TABLE "video"."video_track_fragments" ("video_track_id" uuid NOT NULL, "sequence_number" integer NOT NULL, "offset" integer NOT NULL, "size" integer NOT NULL, "start_ms" integer NOT NULL, "duration_ms" integer NOT NULL, PRIMARY KEY ("video_track_id","sequence_number") , FOREIGN KEY ("video_track_id") REFERENCES "video"."video_tracks"("id") ON UPDATE restrict ON DELETE cascade);COMMENT ON TABLE "video"."video_track_fragments" IS E'Individually decodable byte ranges of a video_track';

alter table "video"."video_tracks" alter column "id" set default gen_random_uuid();

alter table "video"."video_tracks" drop column "type" cascade;

alter table "video"."video_tracks" drop column "format_data" cascade;

alter table "video"."audio_tracks" drop column "format_data" cascade;
