ALTER TABLE "video"."temporals" ALTER COLUMN "next_byte" TYPE int4;
alter table "video"."temporals" alter column "next_byte" set default '0';
