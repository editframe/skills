alter table "video2"."transcriptions" drop constraint "transcriptions_api_key_id_fkey",
  add constraint "transcriptions_api_key_id_fkey"
  foreign key ("api_key_id")
  references "identity"."api_keys"
  ("id") on update restrict on delete no action;
