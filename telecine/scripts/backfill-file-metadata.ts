#!/usr/bin/env node
import { db } from "@/sql-client.server";
import { sql } from "kysely";

async function backfillImageMetadata() {
  const result = await sql`
    UPDATE video2.files f
    SET
      byte_size = COALESCE(f.byte_size, img.byte_size),
      md5 = COALESCE(f.md5, img.md5::text),
      mime_type = COALESCE(f.mime_type, img.mime_type),
      width = COALESCE(f.width, img.width),
      height = COALESCE(f.height, img.height)
    FROM video2.image_files img
    WHERE f.id = img.id
      AND f.type = 'image'
      AND (f.byte_size IS NULL OR f.mime_type IS NULL OR f.width IS NULL OR f.height IS NULL)
  `.execute(db);

  console.log("Backfilled image file metadata:", result.numAffectedRows);
}

async function backfillVideoMetadata() {
  const result = await sql`
    UPDATE video2.files f
    SET
      md5 = COALESCE(f.md5, iso.md5::text),
      width = COALESCE(f.width, (vt.probe_info->>'width')::integer),
      height = COALESCE(f.height, (vt.probe_info->>'height')::integer)
    FROM video2.isobmff_files iso
    LEFT JOIN video2.isobmff_tracks vt
      ON vt.file_id = iso.id AND vt.type = 'video'
    WHERE f.id = iso.id
      AND f.type = 'video'
      AND (f.md5 IS NULL OR f.width IS NULL OR f.height IS NULL)
  `.execute(db);

  console.log("Backfilled video file metadata:", result.numAffectedRows);
}

async function main() {
  console.log("Backfilling file metadata...");
  await backfillImageMetadata();
  await backfillVideoMetadata();
  console.log("Done.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
