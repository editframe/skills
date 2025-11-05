comment on column "video"."images"."probe_result" is E'Image assets for video projects';
alter table "video"."images" alter column "probe_result" drop not null;
alter table "video"."images" add column "probe_result" jsonb;
