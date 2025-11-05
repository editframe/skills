CREATE VIEW identity.valid_magic_links_tokens AS
SELECT *
FROM identity.tokens
WHERE claimed_at IS NULL
AND user_id IS NOT NULL;
