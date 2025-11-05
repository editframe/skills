alter table "api"."webhook_events" add constraint "webhook_events_api_key_id_qualified_table_record_id_key" unique ("api_key_id", "qualified_table", "record_id");
