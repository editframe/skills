comment on column "video2"."render_fragments"."attempt_number" is E'Status tracking for individual fragments of a render';
alter table "video2"."render_fragments" alter column "attempt_number" drop not null;
alter table "video2"."render_fragments" add column "attempt_number" int4;
