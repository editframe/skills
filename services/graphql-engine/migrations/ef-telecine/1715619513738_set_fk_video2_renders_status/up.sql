alter table "video2"."renders"
  add constraint "renders_status_fkey"
  foreign key ("status")
  references "video2"."render_statuses"
  ("value") on update restrict on delete restrict;
