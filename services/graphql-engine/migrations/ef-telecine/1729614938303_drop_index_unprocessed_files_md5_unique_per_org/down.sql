CREATE  INDEX "unprocessed_files_md5_unique_per_org" on
  "video2"."unprocessed_files" using btree ("md5", "org_id");
