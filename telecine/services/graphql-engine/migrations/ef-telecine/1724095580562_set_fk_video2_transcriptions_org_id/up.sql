alter table "video2"."transcriptions"
  add constraint "transcriptions_org_id_fkey"
  foreign key ("org_id")
  references "identity"."orgs"
  ("id") on update restrict on delete no action;
