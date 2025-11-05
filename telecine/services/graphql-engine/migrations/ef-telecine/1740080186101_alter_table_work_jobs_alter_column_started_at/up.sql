ALTER TABLE "work"."jobs" ALTER COLUMN "started_at" TYPE timestamp with time zone;
alter table "work"."jobs" alter column "started_at" drop not null;
