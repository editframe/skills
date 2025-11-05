alter table "video2"."process_isobmff" drop constraint "process_isobmff_unprocessed_file_id_fkey",
  add constraint "process_isobmff_unprocessed_file_id_fkey"
  foreign key ("unprocessed_file_id")
  references "video2"."unprocessed_files"
  ("id") on update restrict on delete restrict;
