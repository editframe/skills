-- isobmff_files
alter table video2.isobmff_files
  add column md5 UUID;

update
  video2.isobmff_files
set
  md5 = id::uuid;

alter table video2.isobmff_files
  alter column md5 set not null;

alter table video2.isobmff_files
  add constraint isbmff_files_md5_unique_per_org unique (md5, org_id);

-- image files
alter table video2.image_files
  add column md5 UUID;

update
  video2.image_files
set
  md5 = id::uuid;

alter table video2.image_files
  alter column md5 set not null;

alter table video2.image_files
  add constraint image_files_md5_unique_per_org unique (md5, org_id);

-- caption files
alter table video2.caption_files
  add column md5 UUID;

update
  video2.caption_files
set
  md5 = id::uuid;

alter table video2.caption_files
  alter column md5 set not null;

alter table video2.caption_files
  add constraint caption_files_md5_unique_per_org unique (md5, org_id);


-- unprocessed files
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'video2' 
                   AND table_name = 'unprocessed_files' 
                   AND column_name = 'created_at') THEN
        ALTER TABLE video2.unprocessed_files
        ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();
    END IF;
END $$;
alter table video2.unprocessed_files
  add column md5 UUID;

update
  video2.unprocessed_files
set
  md5 = id::uuid;

alter table video2.unprocessed_files
  alter column md5 set not null;

alter table video2.unprocessed_files
  add constraint unprocessed_files_md5_unique_per_org unique (md5, org_id);

-- renders
alter table video2.renders
  add column md5 UUID;

update
  video2.renders
set
  md5 = id::uuid;

alter table video2.renders
  alter column md5 set not null;

alter table video2.renders
  add constraint renders_md5_unique_per_org unique (md5, org_id);