
CREATE TABLE "video2"."file_processors" ("value" text NOT NULL, "comment" Text NOT NULL, PRIMARY KEY ("value") );COMMENT ON TABLE "video2"."file_processors" IS E'Strategies to process uploaded files';

INSERT INTO "video2"."file_processors"("value", "comment") VALUES (E'isobmff', E'Process file as isobmff, splitting into tracks');

INSERT INTO "video2"."file_processors"("value", "comment") VALUES (E'captions', E'Generate caption data for a file.');

CREATE TABLE "video2"."unprocessed_files" ("id" uuid NOT NULL, "creator_id" UUID NOT NULL, "org_id" uuid NOT NULL, "complete" boolean NOT NULL DEFAULT false, "filename" text NOT NULL, "byte_size" numeric NOT NULL, "processes" text[] NOT NULL, PRIMARY KEY ("id","org_id") );COMMENT ON TABLE "video2"."unprocessed_files" IS E'Table to track unprocessed media uploads.';

alter table "video2"."unprocessed_files"
  add constraint "unprocessed_files_creator_id_fkey"
  foreign key ("creator_id")
  references "identity"."users"
  ("id") on update restrict on delete cascade;

alter table "video2"."unprocessed_files"
  add constraint "unprocessed_files_org_id_fkey"
  foreign key ("org_id")
  references "identity"."orgs"
  ("id") on update restrict on delete cascade;

alter table "video2"."unprocessed_files" add column "last_received_byte" integer
 not null;

alter table "video2"."unprocessed_files" drop column "complete" cascade;

ALTER TABLE "video2"."unprocessed_files" ALTER COLUMN "byte_size" TYPE int4;

alter table "video2"."unprocessed_files" add column "completed_at" time
 null;

alter table "video2"."unprocessed_files" alter column "byte_size" drop not null;

alter table "video2"."unprocessed_files" alter column "last_received_byte" drop not null;

alter table "video2"."unprocessed_files" add column "api_key_id" uuid
 not null;

alter table "video2"."unprocessed_files" drop column "api_key_id" cascade;

alter table "video2"."unprocessed_files" add column "api_key_id" varchar
 not null;

alter table "video2"."unprocessed_files"
  add constraint "unprocessed_files_api_key_id_fkey"
  foreign key ("api_key_id")
  references "identity"."api_keys"
  ("id") on update restrict on delete set null;

-- Drop the foreign key constraint in video2.renders
ALTER TABLE "video2"."renders" DROP CONSTRAINT "renders_api_key_id_fkey";

-- Drop the foreign key constraint in api.webhooks_requests
ALTER TABLE "api"."webhooks_requests" DROP CONSTRAINT "webhooks_requests_api_key_id_fkey";

-- Drop the foregin key constraint in video2.unprocessed_files
ALTER TABLE "video2"."unprocessed_files" DROP CONSTRAINT "unprocessed_files_api_key_id_fkey";

-- Change the column type in the parent table
ALTER TABLE "identity"."api_keys"
  ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();

ALTER TABLE "identity"."api_keys"
  ALTER COLUMN "id" TYPE uuid USING id::uuid;

-- Change the column type in the child table video2.renders
ALTER TABLE "video2"."renders"
  ALTER COLUMN "api_key_id" TYPE uuid USING api_key_id::uuid;

-- Change the column type in the child table api.webhooks_requests
ALTER TABLE "api"."webhooks_requests"
  ALTER COLUMN "api_key_id" TYPE uuid USING api_key_id::uuid;
  
-- Change the column type in the child table video2.unprocessed_files
ALTER TABLE "video2"."unprocessed_files"
  ALTER COLUMN "api_key_id" TYPE uuid USING api_key_id::uuid;

-- Recreate the foreign key constraint in video2.renders
ALTER TABLE "video2"."renders"
  ADD CONSTRAINT "renders_api_key_id_fkey" FOREIGN KEY ("api_key_id") REFERENCES "identity"."api_keys"("id");

-- Recreate the foreign key constraint in api.webhooks_requests
ALTER TABLE "api"."webhooks_requests"
  ADD CONSTRAINT "webhooks_requests_api_key_id_fkey" FOREIGN KEY ("api_key_id") REFERENCES "identity"."api_keys"("id");

-- Recreate the foreign key constrant in video2.unprocessed_files
ALTER TABLE "video2"."unprocessed_files"
  ADD CONSTRAINT "unprocessed_files_api_key_id_fkey" FOREIGN KEY ("api_key_id") REFERENCES "identity"."api_keys"("id");

alter table "video2"."image_files" add column "api_key_id" uuid
 null;

alter table "video2"."image_files"
  add constraint "image_files_api_key_id_fkey"
  foreign key ("api_key_id")
  references "identity"."api_keys"
  ("id") on update restrict on delete set null;

alter table "video2"."isobmff_files" add column "api_key_id" uuid
 null;

alter table "video2"."isobmff_files"
  add constraint "isobmff_files_api_key_id_fkey"
  foreign key ("api_key_id")
  references "identity"."api_keys"
  ("id") on update restrict on delete set null;

alter table "video2"."isobmff_tracks" add column "api_key_id" uuid
 null;

alter table "video2"."isobmff_tracks"
  add constraint "isobmff_tracks_api_key_id_fkey"
  foreign key ("api_key_id")
  references "identity"."api_keys"
  ("id") on update restrict on delete set null;

alter table "video2"."caption_files" add column "api_key_id" uuid
 null;

alter table "video2"."caption_files"
  add constraint "caption_files_api_key_id_fkey"
  foreign key ("api_key_id")
  references "identity"."api_keys"
  ("id") on update restrict on delete set null;
