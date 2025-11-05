alter table "video2"."process_isobmff"
  add constraint "process_isobmff_isobmff_file_id_fkey"
  foreign key ("isobmff_file_id")
  references "video2"."isobmff_files"
  ("id") on update restrict on delete set null;
