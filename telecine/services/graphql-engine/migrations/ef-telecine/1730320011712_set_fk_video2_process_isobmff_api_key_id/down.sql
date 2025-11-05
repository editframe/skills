alter table "video2"."process_isobmff" drop constraint "process_isobmff_api_key_id_fkey",
  add constraint "process_isobmff_api_key_id_fkey"
  foreign key ("api_key_id")
  references "identity"."api_keys"
  ("id") on update restrict on delete restrict;
