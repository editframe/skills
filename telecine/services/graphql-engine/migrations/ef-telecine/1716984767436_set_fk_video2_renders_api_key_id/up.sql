alter table "video2"."renders" drop constraint "renders_api_key_id_fkey",
  add constraint "renders_api_key_id_fkey"
  foreign key ("api_key_id")
  references "identity"."api_keys"
  ("id") on update restrict on delete cascade;
