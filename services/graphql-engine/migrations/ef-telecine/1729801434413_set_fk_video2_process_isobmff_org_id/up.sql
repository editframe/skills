alter table "video2"."process_isobmff"
  add constraint "process_isobmff_org_id_fkey"
  foreign key ("org_id")
  references "identity"."orgs"
  ("id") on update restrict on delete restrict;
