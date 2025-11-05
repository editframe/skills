CREATE  INDEX "image_files_md5_unique_per_org" on
  "video2"."image_files" using btree ("md5", "org_id");
