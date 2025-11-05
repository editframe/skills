alter table "work"."jobs" alter column "started_at" set not null;
ALTER TABLE "work"."jobs" ALTER COLUMN "started_at" TYPE timestamp with time zone;
