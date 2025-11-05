alter table "video2"."process_html" add column "created_at" timestamptz
 null default now();
