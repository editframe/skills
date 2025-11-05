UPDATE identity.api_keys
SET webhook_secret = generate_webhook_secret()
WHERE webhook_secret IS NULL;  -- Optional: Only update records where the column is currently NULL

ALTER TABLE identity.api_keys
ALTER COLUMN webhook_secret SET DEFAULT generate_webhook_secret();
