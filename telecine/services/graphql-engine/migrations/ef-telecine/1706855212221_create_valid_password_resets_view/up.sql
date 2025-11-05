CREATE VIEW identity.valid_password_resets AS
SELECT *
FROM identity.password_resets
WHERE claimed_at IS NULL
AND created_at >= now() - interval '1 hour'
ORDER BY created_at DESC;
