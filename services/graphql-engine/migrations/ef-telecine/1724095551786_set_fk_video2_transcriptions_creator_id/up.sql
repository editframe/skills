alter table "video2"."transcriptions"
  add constraint "transcriptions_creator_id_fkey"
  foreign key ("creator_id")
  references "identity"."users"
  ("id") on update restrict on delete no action;
