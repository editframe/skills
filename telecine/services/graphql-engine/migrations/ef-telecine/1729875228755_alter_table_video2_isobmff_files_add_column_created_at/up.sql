alter table "video2"."isobmff_files" add column "created_at" timestamptz
 not null default now();
