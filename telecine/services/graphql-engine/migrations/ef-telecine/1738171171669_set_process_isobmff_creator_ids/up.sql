-- Update existing records to set creator_id to org's primary_user_id
UPDATE video2.process_isobmff pi
SET creator_id = o.primary_user_id
FROM identity.orgs o
WHERE pi.org_id = o.id
  AND pi.creator_id IS NULL;

-- Make creator_id non-nullable
ALTER TABLE video2.process_isobmff
ALTER COLUMN creator_id SET NOT NULL;
