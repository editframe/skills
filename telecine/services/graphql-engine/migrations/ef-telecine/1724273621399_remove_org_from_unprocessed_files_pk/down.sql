alter table video2.unprocessed_files
  drop constraint unprocessed_files_pkey;

alter table video2.unprocessed_files
  add primary key (id, org_id);

