
alter table "video2"."image_files" add column "byte_size" integer
 not null;

alter table "video2"."caption_files" add column "byte_size" integer
 not null;

alter table "video2"."caption_files" alter column "byte_size" drop not null;

alter table "video2"."image_files" alter column "byte_size" drop not null;
