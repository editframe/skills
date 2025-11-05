alter table "video"."temporals" add column "next_byte" bigint
 not null default '0';
