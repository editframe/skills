ALTER TABLE video2.transcriptions 
ALTER COLUMN failed_at TYPE timestamptz 
USING (CURRENT_DATE + failed_at)::timestamptz AT TIME ZONE 'UTC';
