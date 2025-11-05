
create schema "video2";

CREATE TABLE "video2"."isobmff_track_types" ("value" text NOT NULL, "comment" text NOT NULL, PRIMARY KEY ("value") );COMMENT ON TABLE "video2"."isobmff_track_types" IS E'Enum table for track types in ISOBMFF files';

INSERT INTO "video2"."isobmff_track_types"("value", "comment") VALUES (E'video', E'A track containing video sample data.');

INSERT INTO "video2"."isobmff_track_types"("value", "comment") VALUES (E'audio', E'A track containing audio sample data.');

CREATE TABLE "video2"."isobmff_file" ("id" uuid NOT NULL, "creator_id" uuid NOT NULL, PRIMARY KEY ("id") );COMMENT ON TABLE "video2"."isobmff_file" IS E'Files in isobmff fragment format. Id is an md5 hash of the original souce file.';

alter table "video2"."isobmff_file" rename to "isobmff_files";

CREATE TABLE "video2"."isobmff_tracks" ("file_id" uuid NOT NULL, "track_id" integer NOT NULL, "type" text NOT NULL, "probe_info" jsonb NOT NULL, "duration_ms" Integer NOT NULL, "codec_name" text NOT NULL, "bytesize" integer NOT NULL, "last_received_byte" integer NOT NULL, PRIMARY KEY ("file_id","track_id") , FOREIGN KEY ("file_id") REFERENCES "video2"."isobmff_files"("id") ON UPDATE restrict ON DELETE cascade, FOREIGN KEY ("type") REFERENCES "video2"."isobmff_track_types"("value") ON UPDATE restrict ON DELETE restrict);COMMENT ON TABLE "video2"."isobmff_tracks" IS E'A track within an ISO base media file. Id is composite of track id and the file id.';

CREATE TABLE "video2"."isobmff_track_fragments" ("file_id" uuid NOT NULL, "track_id" integer NOT NULL, "sequence_number" Integer NOT NULL, "offset" Integer NOT NULL, "bytesize" Integer NOT NULL, "start_ms" integer NOT NULL, "duration_ms" Integer NOT NULL, PRIMARY KEY ("file_id","track_id","sequence_number") , FOREIGN KEY ("file_id", "track_id") REFERENCES "video2"."isobmff_tracks"("file_id", "track_id") ON UPDATE restrict ON DELETE cascade);COMMENT ON TABLE "video2"."isobmff_track_fragments" IS E'Byte and timestamp offsets for specific fragments within isobmff tracks';

alter table "video2"."isobmff_files"
  add constraint "isobmff_files_creator_id_fkey"
  foreign key ("creator_id")
  references "identity"."users"
  ("id") on update cascade on delete restrict;

CREATE TABLE "video2"."image_files" ("id" uuid NOT NULL, "created_at" timestamptz NOT NULL DEFAULT now(), "creator_id" UUID NOT NULL, "mime_type" text NOT NULL, "width" Integer NOT NULL, "height" Integer NOT NULL, "bytesize" Integer NOT NULL, "last_received_byte" Integer NOT NULL, PRIMARY KEY ("id") , FOREIGN KEY ("creator_id") REFERENCES "identity"."users"("id") ON UPDATE restrict ON DELETE restrict);COMMENT ON TABLE "video2"."image_files" IS E'Image files to be displayed in renders. Id is an md5 hash of the original file';

alter table "video2"."isobmff_files" drop constraint "isobmff_files_creator_id_fkey",
  add constraint "isobmff_files_creator_id_fkey"
  foreign key ("creator_id")
  references "identity"."users"
  ("id") on update restrict on delete restrict;

CREATE TABLE "video2"."caption_files" ("id" uuid NOT NULL, "creator_id" uuid NOT NULL, "created_at" timestamptz NOT NULL DEFAULT now(), PRIMARY KEY ("id") , FOREIGN KEY ("creator_id") REFERENCES "identity"."users"("id") ON UPDATE restrict ON DELETE restrict);COMMENT ON TABLE "video2"."caption_files" IS E'Files with generated timed captions. Id is a reference to the original source file.';

alter table "video2"."image_files" drop column "bytesize" cascade;

alter table "video2"."image_files" drop column "last_received_byte" cascade;
