
-- Could not auto-generate a down migration.
-- Please write an appropriate down migration for the SQL below:
-- alter table "video2"."caption_files" add column "filename" text
--  not null;

-- Could not auto-generate a down migration.
-- Please write an appropriate down migration for the SQL below:
-- alter table "video2"."isobmff_files" add column "filename" text
--  not null;

-- Could not auto-generate a down migration.
-- Please write an appropriate down migration for the SQL below:
-- alter table "video2"."image_files" add column "filename" text
--  not null;

alter table "video2"."caption_files" drop constraint "caption_files_org_id_fkey";

-- Could not auto-generate a down migration.
-- Please write an appropriate down migration for the SQL below:
-- alter table "video2"."caption_files" add column "org_id" uuid
--  not null;

ALTER TABLE "video2"."isobmff_tracks" ALTER COLUMN "last_received_byte" drop default;

alter table "video2"."isobmff_tracks" rename column "byte_size" to "bytesize";

alter table "video2"."isobmff_tracks" drop constraint "isobmff_tracks_creator_id_fkey";

-- Could not auto-generate a down migration.
-- Please write an appropriate down migration for the SQL below:
-- alter table "video2"."isobmff_tracks" add column "creator_id" uuid
--  not null;

alter table "video2"."isobmff_files" alter column "fragment_index_complete" drop not null;

alter table "video2"."isobmff_files" rename column "fragment_index_complete" to "complete";

alter table "video2"."isobmff_files" rename column "complete" to "index_uploaded";

alter table "video2"."isobmff_files" drop constraint "isobmff_files_org_id_fkey";

-- Could not auto-generate a down migration.
-- Please write an appropriate down migration for the SQL below:
-- alter table "video2"."isobmff_files" add column "org_id" uuid
--  not null;

alter table "video2"."image_files" alter column "org_id" drop not null;

alter table "video2"."image_files" drop constraint "image_files_org_id_fkey";

-- Could not auto-generate a down migration.
-- Please write an appropriate down migration for the SQL below:
-- alter table "video2"."image_files" add column "org_id" uuid
--  null;
