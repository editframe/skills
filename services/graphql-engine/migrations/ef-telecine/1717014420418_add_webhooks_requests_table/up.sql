
CREATE TABLE api.webhooks_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    api_key_id CHARACTER VARYING NOT NULL,
    status_code INTEGER NOT NULL,
    render_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT now(),
    retry_count INTEGER DEFAULT 0,
    last_retried TIMESTAMP
);

alter table "api"."webhooks_requests"
  add constraint "webhooks_requests_api_key_id_fkey"
  foreign key ("api_key_id")
  references "identity"."api_keys"
  ("id") on update restrict on delete restrict;

alter table "api"."webhooks_requests"
  add constraint "webhooks_requests_render_id_fkey"
  foreign key ("render_id")
  references "video2"."renders"
  ("id") on update restrict on delete restrict;

ALTER TABLE "api"."webhooks_requests" ALTER COLUMN "last_retried" TYPE timestamptz;
alter table "api"."webhooks_requests" rename column "last_retried" to "last_attempted_at";

alter table "api"."webhooks_requests" alter column "render_id" drop not null;

alter table "api"."webhooks_requests" add column "org_id" uuid
 not null;

alter table "api"."webhooks_requests"
  add constraint "webhooks_requests_org_id_fkey"
  foreign key ("org_id")
  references "identity"."orgs"
  ("id") on update restrict on delete restrict;
