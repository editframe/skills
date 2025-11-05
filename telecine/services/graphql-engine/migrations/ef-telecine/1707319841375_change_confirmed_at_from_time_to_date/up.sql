ALTER TABLE identity.email_confirmations
ALTER COLUMN confirmed_at TYPE TIMESTAMP WITH TIME ZONE
USING current_date + confirmed_at::time with time zone;
