CREATE OR REPLACE FUNCTION identity.generate_token(email_row identity.valid_email_confirmations)
RETURNS TEXT AS $$
  SELECT MD5(email_row.id::TEXT)
$$ LANGUAGE sql STABLE;
