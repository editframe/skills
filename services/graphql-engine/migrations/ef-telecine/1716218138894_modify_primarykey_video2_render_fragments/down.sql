alter table "video2"."render_fragments" drop constraint "render_fragments_pkey";
alter table "video2"."render_fragments"
    add constraint "render_fragments_pkey"
    primary key ("segment_id", "attempt_number", "render_id");
