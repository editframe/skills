alter table "identity"."orgs"
  add constraint "orgs_primary_user_id_fkey"
  foreign key ("primary_user_id")
  references "identity"."users"
  ("id") on update restrict on delete restrict;
