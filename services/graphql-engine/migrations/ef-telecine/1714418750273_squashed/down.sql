
comment on column "video2"."image_files"."last_received_byte" is E'Image files to be displayed in renders. Id is an md5 hash of the original file';
alter table "video2"."image_files" alter column "last_received_byte" drop not null;
alter table "video2"."image_files" add column "last_received_byte" int4;

comment on column "video2"."image_files"."bytesize" is E'Image files to be displayed in renders. Id is an md5 hash of the original file';
alter table "video2"."image_files" alter column "bytesize" drop not null;
alter table "video2"."image_files" add column "bytesize" int4;

DROP TABLE "video2"."caption_files";

alter table "video2"."isobmff_files" drop constraint "isobmff_files_creator_id_fkey",
  add constraint "isobmff_files_creator_id_fkey"
  foreign key ("creator_id")
  references "identity"."users"
  ("id") on update cascade on delete restrict;

DROP TABLE "video2"."image_files";

alter table "video2"."isobmff_files" drop constraint "isobmff_files_creator_id_fkey";

DROP TABLE "video2"."isobmff_track_fragments";

DROP TABLE "video2"."isobmff_tracks";

alter table "video2"."isobmff_files" rename to "isobmff_file";

DROP TABLE "video2"."isobmff_file";

DELETE FROM "video2"."isobmff_track_types" WHERE "value" = 'audio';

DELETE FROM "video2"."isobmff_track_types" WHERE "value" = 'video';

DROP TABLE "video2"."isobmff_track_types";

drop schema "video2" cascade;
