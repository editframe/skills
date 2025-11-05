comment on column "video"."images"."original_filename" is E'Image assets for video projects';
alter table "video"."images" alter column "original_filename" drop not null;
alter table "video"."images" add column "original_filename" text;
