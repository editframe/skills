alter table "video"."temporals" alter column "next_byte" set default '0'::bigint;
ALTER TABLE "video"."temporals" ALTER COLUMN "next_byte" TYPE bigint;
