alter table "video2"."renders" add column "metadata" jsonb
 not null default '{}';
