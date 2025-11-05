alter table "video2"."transcriptions"
  add constraint "transcriptions_status_fkey"
  foreign key ("status")
  references "video2"."transcription_statuses"
  ("value") on update restrict on delete restrict;
