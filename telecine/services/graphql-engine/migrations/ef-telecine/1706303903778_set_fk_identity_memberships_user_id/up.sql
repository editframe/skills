alter table "identity"."memberships"
  add constraint "memberships_user_id_fkey"
  foreign key ("user_id")
  references "identity"."users"
  ("id") on update restrict on delete cascade;
