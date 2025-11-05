alter table "api"."webhooks_requests"
  add constraint "webhooks_requests_render_id_fkey"
  foreign key (render_id)
  references "video2"."renders"
  (id) on update restrict on delete restrict;
alter table "api"."webhooks_requests" alter column "render_id" drop not null;
alter table "api"."webhooks_requests" add column "render_id" uuid;
