alter table "identity"."roles" drop constraint "roles_role_key";
alter table "identity"."roles" rename column "role" to "comment";
