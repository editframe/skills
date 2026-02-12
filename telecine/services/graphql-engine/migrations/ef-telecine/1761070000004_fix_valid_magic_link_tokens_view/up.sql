DROP VIEW IF EXISTS identity.valid_magic_links_tokens;

CREATE VIEW identity.valid_magic_link_tokens AS
SELECT *
FROM identity.magic_link_tokens
WHERE claimed_at IS NULL
AND user_id IS NOT NULL
AND created_at >= now() - interval '1 hour';
