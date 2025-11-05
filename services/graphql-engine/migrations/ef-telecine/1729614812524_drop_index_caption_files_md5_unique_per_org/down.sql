CREATE  INDEX "caption_files_md5_unique_per_org" on
  "video2"."caption_files" using btree ("md5", "org_id");
