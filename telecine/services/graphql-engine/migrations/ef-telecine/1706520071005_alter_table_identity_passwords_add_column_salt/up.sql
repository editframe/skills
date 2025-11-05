alter table "identity"."passwords" add column "salt" bytea
 not null;
