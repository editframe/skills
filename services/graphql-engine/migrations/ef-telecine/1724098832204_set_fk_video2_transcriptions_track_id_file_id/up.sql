alter table "video2"."transcriptions" drop constraint "transcriptions_track_id_file_id_fkey",
  add constraint "transcriptions_track_id_file_id_fkey"
  foreign key ("track_id", "file_id")
  references "video2"."isobmff_tracks"
  ("track_id", "file_id") on update restrict on delete no action;
