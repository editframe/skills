comment on column "video2"."process_isobmff"."started_at" is E'Process an unprocessed file as an isobmff_file';
alter table "video2"."process_isobmff" alter column "started_at" drop not null;
alter table "video2"."process_isobmff" add column "started_at" timetz;
