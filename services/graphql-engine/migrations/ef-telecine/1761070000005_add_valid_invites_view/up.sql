CREATE VIEW identity.valid_invites AS
SELECT *
FROM identity.invites
WHERE accepted_at IS NULL
AND denied_at IS NULL
AND created_at >= now() - interval '30 days';
