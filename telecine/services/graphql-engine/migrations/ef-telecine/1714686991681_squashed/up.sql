
alter table "video2"."image_files" add column "org_id" uuid
 null;

alter table "video2"."image_files"
  add constraint "image_files_org_id_fkey"
  foreign key ("org_id")
  references "identity"."orgs"
  ("id") on update restrict on delete restrict;

alter table "video2"."image_files" alter column "org_id" set not null;

alter table "video2"."isobmff_files" add column "org_id" uuid
 not null;

alter table "video2"."isobmff_files"
  add constraint "isobmff_files_org_id_fkey"
  foreign key ("org_id")
  references "identity"."orgs"
  ("id") on update restrict on delete restrict;

alter table "video2"."isobmff_files" rename column "index_uploaded" to "complete";

alter table "video2"."isobmff_files" rename column "complete" to "fragment_index_complete";

alter table "video2"."isobmff_files" alter column "fragment_index_complete" set not null;

alter table "video2"."isobmff_tracks" add column "creator_id" uuid
 not null;

alter table "video2"."isobmff_tracks"
  add constraint "isobmff_tracks_creator_id_fkey"
  foreign key ("creator_id")
  references "identity"."users"
  ("id") on update restrict on delete restrict;

alter table "video2"."isobmff_tracks" rename column "bytesize" to "byte_size";

alter table "video2"."isobmff_tracks" alter column "last_received_byte" set default '0';

alter table "video2"."caption_files" add column "org_id" uuid
 not null;

alter table "video2"."caption_files"
  add constraint "caption_files_org_id_fkey"
  foreign key ("org_id")
  references "identity"."orgs"
  ("id") on update restrict on delete restrict;

alter table "video2"."image_files" add column "filename" text
 not null;

alter table "video2"."isobmff_files" add column "filename" text
 not null;

alter table "video2"."caption_files" add column "filename" text
 not null;
