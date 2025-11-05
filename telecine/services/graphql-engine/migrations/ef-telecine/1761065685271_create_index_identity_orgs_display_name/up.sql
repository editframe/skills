CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_orgs_display_name_trgm ON identity.orgs USING gin (lower(display_name) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_users_first_name_trgm ON identity.users USING gin (lower(first_name) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_users_last_name_trgm ON identity.users USING gin (lower(last_name) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_email_passwords_email_trgm ON identity.email_passwords USING gin (lower(email_address) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_orgs_primary_user_id ON identity.orgs(primary_user_id);
CREATE INDEX IF NOT EXISTS idx_email_passwords_user_id ON identity.email_passwords(user_id);
