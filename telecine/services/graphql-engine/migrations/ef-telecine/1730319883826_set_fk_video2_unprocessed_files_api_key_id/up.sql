alter table "video2"."unprocessed_files" drop constraint "unprocessed_files_api_key_id_fkey",
  add constraint "unprocessed_files_api_key_id_fkey"
  foreign key ("api_key_id")
  references "identity"."api_keys"
  ("id") on update no action on delete set null;
