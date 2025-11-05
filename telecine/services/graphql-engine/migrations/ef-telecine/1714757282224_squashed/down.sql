
alter table "video2"."image_files" alter column "byte_size" set not null;

alter table "video2"."caption_files" alter column "byte_size" set not null;

-- Could not auto-generate a down migration.
-- Please write an appropriate down migration for the SQL below:
-- alter table "video2"."caption_files" add column "byte_size" integer
--  not null;

-- Could not auto-generate a down migration.
-- Please write an appropriate down migration for the SQL below:
-- alter table "video2"."image_files" add column "byte_size" integer
--  not null;
