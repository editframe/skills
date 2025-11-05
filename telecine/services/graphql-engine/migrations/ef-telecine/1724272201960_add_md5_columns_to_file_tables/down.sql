alter table video2.isobmff_files
  drop column md5;

alter table video2.image_files
  drop column md5;

alter table video2.caption_files
  drop column md5;

alter table video2.unprocessed_files
  drop column md5;

alter table video2.renders
  drop column md5;

