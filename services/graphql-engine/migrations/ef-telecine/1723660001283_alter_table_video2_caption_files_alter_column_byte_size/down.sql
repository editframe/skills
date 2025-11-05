alter table "video2"."caption_files" alter column "byte_size" drop not null;
ALTER TABLE "video2"."caption_files" ALTER COLUMN "byte_size" drop default;
