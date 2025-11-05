CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_orgs_website_trgm ON identity.orgs USING gin (lower(website) gin_trgm_ops);

