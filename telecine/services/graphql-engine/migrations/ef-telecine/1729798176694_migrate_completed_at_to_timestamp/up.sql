ALTER TABLE video2.unprocessed_files
ALTER COLUMN completed_at
SET DATA TYPE timestamp with time zone
USING (current_date + completed_at::time with time zone);
