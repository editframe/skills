alter table "video2"."transcriptions" drop constraint "transcriptions_file_id_track_id_key";
alter table "video2"."transcriptions" add constraint "transcriptions_file_id_track_id_key" unique ("file_id", "track_id");
