alter table "identity"."invites" drop constraint "invites_org_id_fkey",
  add constraint "invites_org_id_fkey"
  foreign key ("org_id")
  references "identity"."orgs"
  ("id") on update restrict on delete cascade;
