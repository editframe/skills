ALTER TABLE video2.image_files 
  ALTER COLUMN api_key_id DROP NOT NULL;

ALTER TABLE video2.isobmff_files 
  ALTER COLUMN api_key_id DROP NOT NULL;

ALTER TABLE video2.isobmff_tracks 
  ALTER COLUMN api_key_id DROP NOT NULL;

ALTER TABLE video2.renders 
  ALTER COLUMN api_key_id DROP NOT NULL;

ALTER TABLE video2.unprocessed_files 
  ALTER COLUMN api_key_id DROP NOT NULL;

ALTER TABLE video2.caption_files 
  ALTER COLUMN api_key_id DROP NOT NULL;

ALTER TABLE video2.process_isobmff 
  ALTER COLUMN api_key_id DROP NOT NULL;
