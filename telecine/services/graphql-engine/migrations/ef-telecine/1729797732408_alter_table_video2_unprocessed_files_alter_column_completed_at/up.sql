-- Rename existing column
ALTER TABLE "video2"."unprocessed_files" RENAME COLUMN "completed_at" TO "completed_at_old";

-- Add new column with desired type
ALTER TABLE "video2"."unprocessed_files" ADD COLUMN "completed_at" timestamptz;

-- Copy data with conversion
UPDATE "video2"."unprocessed_files" 
SET "completed_at" = (CURRENT_DATE + "completed_at_old") AT TIME ZONE 'UTC'
WHERE "completed_at_old" IS NOT NULL;

-- Drop old column
ALTER TABLE "video2"."unprocessed_files" DROP COLUMN "completed_at_old";
