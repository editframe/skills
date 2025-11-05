alter table "identity"."roles" rename column "comment" to "role";
alter table "identity"."roles" add constraint "roles_role_key" unique ("role");
