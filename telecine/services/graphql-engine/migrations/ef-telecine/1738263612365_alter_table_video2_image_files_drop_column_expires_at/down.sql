comment on column "video2"."image_files"."expires_at" is E'Image files to be displayed in renders. Id is an md5 hash of the original file';
alter table "video2"."image_files" alter column "expires_at" drop not null;
alter table "video2"."image_files" add column "expires_at" timetz;
