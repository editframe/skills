
CREATE TABLE "video2"."render_strategies" ("value" text NOT NULL, "comment" Text NOT NULL, PRIMARY KEY ("value") );COMMENT ON TABLE "video2"."render_strategies" IS E'Strategies used to render videos';

INSERT INTO "video2"."render_strategies"("value", "comment") VALUES (E'electron_v1', E'First version of electron render strategy.');

INSERT INTO "video2"."render_strategies"("value", "comment") VALUES (E'puppeteer_v1', E'First version of puppeteer render strategy.');

alter table "video2"."renders" add column "strategy" Text
 not null default 'electron_v1';

ALTER TABLE "video2"."renders" ALTER COLUMN "strategy" drop default;

alter table "video2"."renders"
  add constraint "renders_strategy_fkey"
  foreign key ("strategy")
  references "video2"."render_strategies"
  ("value") on update restrict on delete restrict;

INSERT INTO "video2"."render_strategies"("value", "comment") VALUES (E'v1', E'bitmap rendering via electron');

INSERT INTO "video2"."render_strategies"("value", "comment") VALUES (E'v2', E'Screenshot rendering via puppeteer.');

update video2.renders set strategy='v1' where strategy='electron_v1';
delete from video2.render_strategies where value='electron_v1';
delete from video2.render_strategies where value='puppeteer_v2';

update video2.renders set strategy='v1' where strategy='electron_v1';
delete from video2.render_strategies where value='electron_v1';
delete from video2.render_strategies where value='puppeteer_v1';
