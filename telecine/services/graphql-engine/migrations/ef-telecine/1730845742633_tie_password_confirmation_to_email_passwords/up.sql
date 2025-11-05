-- Add email_password_id column to email_confirmations
ALTER TABLE identity.email_confirmations
ADD COLUMN email_password_id uuid REFERENCES identity.email_passwords(id);

-- Update existing records to link to the first email_password for each user
UPDATE identity.email_confirmations ec
SET email_password_id = ep.id
FROM (
    SELECT DISTINCT ON (user_id) id, user_id
    FROM identity.email_passwords
    ORDER BY user_id, created_at ASC
) ep
WHERE ec.user_id = ep.user_id;

-- Make the column required after populating data
ALTER TABLE identity.email_confirmations
ALTER COLUMN email_password_id SET NOT NULL;
