import { readFile, writeFile, rename, unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import debug from "debug";
import ISOBoxer from "codem-isoboxer";

const log = debug("ef:cli:patch-mp4");

/**
 * Patches mvhd.duration, zeroes tkhd/mdhd durations, and removes edts boxes
 * from a fragmented MP4 buffer. This fixes mvhd.duration=0 that mediabunny
 * writes in fragmented mode, enabling duration display in VLC, QuickTime, and WMP.
 */
export function patchMoovDuration(
  arrayBuffer: ArrayBuffer,
  durationMs: number,
): ArrayBuffer {
  const iso = ISOBoxer.parseBuffer(arrayBuffer);

  const mvhd = iso.fetch("mvhd");
  if (mvhd) {
    const timescale: number = mvhd.timescale || 1000;
    mvhd.duration = Math.ceil((durationMs / 1000) * timescale);
  }

  for (const tkhd of iso.fetchAll("tkhd")) {
    if (tkhd) tkhd.duration = 0;
  }

  for (const mdhd of iso.fetchAll("mdhd")) {
    if (mdhd) mdhd.duration = 0;
  }

  const moov = iso.fetch("moov") as any;
  if (moov?.boxes) {
    for (const trak of moov.boxes.filter((b: any) => b.type === "trak")) {
      if (trak.boxes) {
        trak.boxes = trak.boxes.filter((b: any) => b.type !== "edts");
      }
    }
  }

  return iso.write();
}

/**
 * Post-processes a rendered fragmented MP4:
 *
 * Layer 1 (always): patches mvhd.duration so VLC, QuickTime, and WMP can
 * display duration and support seeking.
 *
 * Layer 2 (if ffmpeg on PATH): remuxes to a non-fragmented progressive MP4
 * with moov at the front, for full compatibility including Windows Explorer
 * thumbnails and social upload pipelines.
 */
export async function patchFragmentedMp4(
  outputPath: string,
  durationMs: number,
): Promise<void> {
  // Layer 1: always patch the moov
  const buf = await readFile(outputPath);
  const arrayBuffer = buf.buffer.slice(
    buf.byteOffset,
    buf.byteOffset + buf.byteLength,
  );
  const patched = patchMoovDuration(arrayBuffer, durationMs);
  await writeFile(outputPath, Buffer.from(patched));
  log("Patched mvhd.duration to %dms in %s", durationMs, outputPath);

  // Layer 2: remux to non-fragmented progressive MP4 if ffmpeg is available
  const tmp = outputPath + ".tmp.mp4";
  const result = spawnSync(
    "ffmpeg",
    ["-y", "-i", outputPath, "-c", "copy", "-movflags", "+faststart", tmp],
    { shell: true, stdio: "pipe" },
  );

  if (result.status === 0 && existsSync(tmp)) {
    await rename(tmp, outputPath);
    log("Remuxed to non-fragmented MP4 via ffmpeg: %s", outputPath);
  } else {
    if (existsSync(tmp)) {
      await unlink(tmp).catch(() => {});
    }
    process.stderr.write(
      "Note: install ffmpeg for better MP4 compatibility (Windows Explorer thumbnails, social uploads).\n",
    );
    log(
      "ffmpeg not available or remux failed (status %d), keeping patched fragmented output",
      result.status,
    );
  }
}
