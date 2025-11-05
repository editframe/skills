
-- Could not auto-generate a down migration.
-- Please write an appropriate down migration for the SQL below:
-- update video2.renders set strategy='v1' where strategy='electron_v1';
-- delete from video2.render_strategies where value='electron_v1';
-- delete from video2.render_strategies where value='puppeteer_v1';

-- Could not auto-generate a down migration.
-- Please write an appropriate down migration for the SQL below:
-- update video2.renders set strategy='v1' where strategy='electron_v1';
-- delete from video2.render_strategies where value='electron_v1';
-- delete from video2.render_strategies where value='puppeteer_v2';

DELETE FROM "video2"."render_strategies" WHERE "value" = 'v2';

DELETE FROM "video2"."render_strategies" WHERE "value" = 'v1';

alter table "video2"."renders" drop constraint "renders_strategy_fkey";

alter table "video2"."renders" alter column "strategy" set default 'electron_v1'::text;

-- Could not auto-generate a down migration.
-- Please write an appropriate down migration for the SQL below:
-- alter table "video2"."renders" add column "strategy" Text
--  not null default 'electron_v1';

DELETE FROM "video2"."render_strategies" WHERE "value" = 'puppeteer_v1';

DELETE FROM "video2"."render_strategies" WHERE "value" = 'electron_v1';

DROP TABLE "video2"."render_strategies";
