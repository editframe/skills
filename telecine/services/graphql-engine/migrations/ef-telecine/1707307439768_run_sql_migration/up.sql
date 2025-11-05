CREATE OR REPLACE FUNCTION identity.generate_token(email_row identity.valid_email_confirmations)
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
  SELECT MD5(email_row.id::TEXT)
$function$;
