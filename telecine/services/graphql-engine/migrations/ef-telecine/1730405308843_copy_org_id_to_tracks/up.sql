UPDATE video2.isobmff_tracks t
SET org_id = f.org_id
FROM video2.isobmff_files f
WHERE t.file_id = f.id;
