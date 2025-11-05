CREATE OR REPLACE FUNCTION generate_webhook_secret()
RETURNS TEXT AS $$
BEGIN
    RETURN 'ef_webhook_' || replace(uuid_generate_v4()::text, '-', '');
END;
$$ LANGUAGE plpgsql;
