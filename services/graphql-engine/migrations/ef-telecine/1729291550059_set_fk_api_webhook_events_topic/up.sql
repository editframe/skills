alter table "api"."webhook_events"
  add constraint "webhook_events_topic_fkey"
  foreign key ("topic")
  references "api"."webhook_topics"
  ("value") on update restrict on delete restrict;
