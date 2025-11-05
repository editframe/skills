alter table "api"."webhook_events" drop constraint "webhook_events_api_key_id_fkey",
  add constraint "webhook_events_api_key_id_fkey"
  foreign key ("api_key_id")
  references "identity"."api_keys"
  ("id") on update restrict on delete cascade;
