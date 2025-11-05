
alter table "video2"."caption_files" drop constraint "caption_files_api_key_id_fkey";

-- Could not auto-generate a down migration.
-- Please write an appropriate down migration for the SQL below:
-- alter table "video2"."caption_files" add column "api_key_id" uuid
--  null;

alter table "video2"."isobmff_tracks" drop constraint "isobmff_tracks_api_key_id_fkey";

-- Could not auto-generate a down migration.
-- Please write an appropriate down migration for the SQL below:
-- alter table "video2"."isobmff_tracks" add column "api_key_id" uuid
--  null;

alter table "video2"."isobmff_files" drop constraint "isobmff_files_api_key_id_fkey";

-- Could not auto-generate a down migration.
-- Please write an appropriate down migration for the SQL below:
-- alter table "video2"."isobmff_files" add column "api_key_id" uuid
--  null;

alter table "video2"."image_files" drop constraint "image_files_api_key_id_fkey";

-- Could not auto-generate a down migration.
-- Please write an appropriate down migration for the SQL below:
-- alter table "video2"."image_files" add column "api_key_id" uuid
--  null;

-- Could not auto-generate a down migration.
-- Please write an appropriate down migration for the SQL below:
-- -- Drop the foreign key constraint in video2.renders
-- ALTER TABLE "video2"."renders" DROP CONSTRAINT "renders_api_key_id_fkey";
--
-- -- Drop the foreign key constraint in api.webhooks_requests
-- ALTER TABLE "api"."webhooks_requests" DROP CONSTRAINT "webhooks_requests_api_key_id_fkey";
--
-- -- Drop the foregin key constraint in video2.unprocessed_files
-- ALTER TABLE "video2"."unprocessed_files" DROP CONSTRAINT "unprocessed_files_api_key_id_fkey";
--
-- -- Change the column type in the parent table
-- ALTER TABLE "identity"."api_keys"
--   ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();
--
-- ALTER TABLE "identity"."api_keys"
--   ALTER COLUMN "id" TYPE uuid USING id::uuid;
--
-- -- Change the column type in the child table video2.renders
-- ALTER TABLE "video2"."renders"
--   ALTER COLUMN "api_key_id" TYPE uuid USING api_key_id::uuid;
--
-- -- Change the column type in the child table api.webhooks_requests
-- ALTER TABLE "api"."webhooks_requests"
--   ALTER COLUMN "api_key_id" TYPE uuid USING api_key_id::uuid;
--
-- -- Change the column type in the child table video2.unprocessed_files
-- ALTER TABLE "video2"."unprocessed_files"
--   ALTER COLUMN "api_key_id" TYPE uuid USING api_key_id::uuid;
--
-- -- Recreate the foreign key constraint in video2.renders
-- ALTER TABLE "video2"."renders"
--   ADD CONSTRAINT "renders_api_key_id_fkey" FOREIGN KEY ("api_key_id") REFERENCES "identity"."api_keys"("id");
--
-- -- Recreate the foreign key constraint in api.webhooks_requests
-- ALTER TABLE "api"."webhooks_requests"
--   ADD CONSTRAINT "webhooks_requests_api_key_id_fkey" FOREIGN KEY ("api_key_id") REFERENCES "identity"."api_keys"("id");
--
-- -- Recreate the foreign key constrant in video2.unprocessed_files
-- ALTER TABLE "video2"."unprocessed_files"
--   ADD CONSTRAINT "unprocessed_files_api_key_id_fkey" FOREIGN KEY ("api_key_id") REFERENCES "identity"."api_keys"("id");

alter table "video2"."unprocessed_files" drop constraint "unprocessed_files_api_key_id_fkey";

-- Could not auto-generate a down migration.
-- Please write an appropriate down migration for the SQL below:
-- alter table "video2"."unprocessed_files" add column "api_key_id" varchar
--  not null;

comment on column "video2"."unprocessed_files"."api_key_id" is E'Table to track unprocessed media uploads.';
alter table "video2"."unprocessed_files" alter column "api_key_id" drop not null;
alter table "video2"."unprocessed_files" add column "api_key_id" uuid;

-- Could not auto-generate a down migration.
-- Please write an appropriate down migration for the SQL below:
-- alter table "video2"."unprocessed_files" add column "api_key_id" uuid
--  not null;

alter table "video2"."unprocessed_files" alter column "last_received_byte" set not null;

alter table "video2"."unprocessed_files" alter column "byte_size" set not null;

-- Could not auto-generate a down migration.
-- Please write an appropriate down migration for the SQL below:
-- alter table "video2"."unprocessed_files" add column "completed_at" time
--  null;

ALTER TABLE "video2"."unprocessed_files" ALTER COLUMN "byte_size" TYPE numeric;

comment on column "video2"."unprocessed_files"."complete" is E'Table to track unprocessed media uploads.';
alter table "video2"."unprocessed_files" alter column "complete" set default false;
alter table "video2"."unprocessed_files" alter column "complete" drop not null;
alter table "video2"."unprocessed_files" add column "complete" bool;

-- Could not auto-generate a down migration.
-- Please write an appropriate down migration for the SQL below:
-- alter table "video2"."unprocessed_files" add column "last_received_byte" integer
--  not null;

alter table "video2"."unprocessed_files" drop constraint "unprocessed_files_org_id_fkey";

alter table "video2"."unprocessed_files" drop constraint "unprocessed_files_creator_id_fkey";

DROP TABLE "video2"."unprocessed_files";

DELETE FROM "video2"."file_processors" WHERE "value" = 'captions';

DELETE FROM "video2"."file_processors" WHERE "value" = 'isobmff';

DROP TABLE "video2"."file_processors";
