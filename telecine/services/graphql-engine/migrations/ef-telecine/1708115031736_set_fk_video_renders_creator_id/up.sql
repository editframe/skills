alter table "video"."renders"
  add constraint "renders_creator_id_fkey"
  foreign key ("creator_id")
  references "identity"."users"
  ("id") on update restrict on delete restrict;
