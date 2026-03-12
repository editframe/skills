import * as fs from "node:fs";

import type { ISOFile } from "codem-isoboxer";
import ISOBoxer from "codem-isoboxer";

export const repackageInitSegment = (isoFile: ISOFile, durationMs: number) => {
  // First, we filter out all boxes that are not ftyp or moov, init segmentns
  // only consist of a ftyp + moov box

  isoFile.boxes = isoFile.boxes.filter((box) => {
    return box.type === "ftyp" || box.type === "moov";
  });

  const mvhd = isoFile.fetch("mvhd");
  const mvhdTimeScale = mvhd?.timescale || 1000;
  const movieDuration = Math.ceil((durationMs / 1000) * mvhdTimeScale);

  if (mvhd) {
    mvhd.duration = movieDuration;
  }

  const tkhds = isoFile.fetchAll("tkhd");
  for (const tkhd of tkhds) {
    if (tkhd) {
      tkhd.duration = 0;
    }
  }

  const mdhds = isoFile.fetchAll("mdhd");
  for (const mdhd of mdhds) {
    if (mdhd) {
      mdhd.duration = 0;
    }
  }

  // Based on analysis of working files that Chrome can read duration from:
  // 1. DO NOT add mehd box - working files don't have it and Chrome works fine
  // 2. DO remove edts boxes - working files don't have them
  // The combination of mvhd.duration + zero track/media durations + no edts is what works

  // Remove edit lists (edts boxes) from all tracks
  // Working files that Chrome can read duration from don't have edts boxes
  const moov = isoFile.fetch("moov");
  if (moov) {
    const moovBoxes = (moov as any).boxes;
    for (const box of moovBoxes) {
      if (box.type === "trak" && box.boxes) {
        // Filter out any edts boxes from this track
        box.boxes = box.boxes.filter(
          (trackBox: any) => trackBox.type !== "edts",
        );
      }
    }
  }

  return isoFile.write();
};

export function repackageMediaSegment(
  isoFile: ISOFile,
  sequenceNumber: number,
  baseMediaDecodeTimeMs: number,
  baseMediaDecodeTimeCallback?: (timescale: number) => number,
): ArrayBuffer {
  const mfhd = isoFile.fetch("mfhd");
  if (mfhd) {
    mfhd.sequence_number = sequenceNumber + 1;
  }

  // For media segments, we need to look at track information from the moof box
  const moof = isoFile.fetch("moof");
  if (!moof) {
    throw new Error("No moof box found in media segment");
  }

  const mdhds = isoFile.fetchAll("mdhd");
  const tfdts = isoFile.fetchAll("tfdt");

  for (let i = 0; i < mdhds.length; i++) {
    const timescale = mdhds[i]?.timescale;
    const tfdt = tfdts[i];

    if (!timescale) {
      throw new Error("Track has no timescale");
    }

    // Missing tfdt indicates structural corruption - fail fast instead of ignoring
    if (!tfdt) {
      throw new Error(
        `Missing tfdt for track ${i} - this indicates structural corruption from aggressive trimming. All tracks must have content.`,
      );
    }

    let baseTime = Math.round((baseMediaDecodeTimeMs / 1000) * timescale);
    if (baseMediaDecodeTimeCallback) {
      baseTime = baseMediaDecodeTimeCallback(timescale);
    }

    tfdt.baseMediaDecodeTime = baseTime;
  }

  isoFile.boxes = isoFile.boxes.filter((box) => {
    return box.type !== "ftyp" && box.type !== "moov" && box.type !== "mfra";
  });

  return isoFile.write();
}

export function repackageFragmentIntoFiles(filePath: string): Uint8Array[] {
  const files: Uint8Array[] = [];

  // Parse the original file to get moof count
  const originalBuffer = fs.readFileSync(filePath);
  const originalIsoFile = ISOBoxer.parseBuffer(originalBuffer.buffer);
  const moofBoxes = originalIsoFile.fetchAll("moof");

  // Create one file for each moof
  for (let i = 0; i < moofBoxes.length; i++) {
    // Parse fresh instance for this moof
    const isoFile = ISOBoxer.parseBuffer(originalBuffer.buffer);

    // Grab the specific boxes we need from this fresh parse
    const ftypBox = isoFile.fetch("ftyp");
    const moovBox = isoFile.fetch("moov");
    const allMoofBoxes = isoFile.fetchAll("moof");
    const allMdatBoxes = isoFile.fetchAll("mdat");

    const targetMoofBox = allMoofBoxes[i];
    const targetMdatBox = allMdatBoxes[i]; // Adjust indexing as needed

    if (!targetMoofBox || !targetMdatBox) {
      throw new Error("Missing moof or mdat box");
    }

    // Create new structure with just the boxes we want
    isoFile.boxes = [ftypBox, moovBox, targetMoofBox, targetMdatBox];

    // Write the file
    const fileBytes = isoFile.write();
    files.push(new Uint8Array(fileBytes));
  }

  return files;
}
