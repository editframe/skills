alter table "video2"."unprocessed_files" add constraint "unprocessed_files_md5_org_id_key" unique ("md5", "org_id");
