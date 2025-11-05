alter table "video2"."process_html"
  add constraint "process_html_creator_id_fkey"
  foreign key ("creator_id")
  references "identity"."users"
  ("id") on update restrict on delete no action;
