alter table "video2"."process_isobmff"
  add constraint "process_isobmff_source_type_fkey"
  foreign key ("source_type")
  references "video2"."isobmff_source_types"
  ("value") on update restrict on delete restrict;
