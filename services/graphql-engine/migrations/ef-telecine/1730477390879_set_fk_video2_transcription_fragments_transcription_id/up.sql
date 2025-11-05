alter table "video2"."transcription_fragments" drop constraint "transcription_fragments_transcription_id_fkey",
  add constraint "transcription_fragments_transcription_id_fkey"
  foreign key ("transcription_id")
  references "video2"."transcriptions"
  ("id") on update restrict on delete cascade;
