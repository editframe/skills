alter table "video2"."transcriptions" drop constraint "transcriptions_file_id_track_id_key";
alter table "video2"."transcriptions" add constraint "transcriptions_id_track_id_key" unique ("id", "track_id");
