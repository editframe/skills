import { execPromise } from '@/util/execPromise';

interface Mp4DumpBox {
  name: string;
  size?: number;
  children?: Mp4DumpBox[];
  [key: string]: any; // Allow additional properties like duration, timescale, etc.
}

interface Mp4DumpBoxes {
  trun: Mp4DumpBox & { "sample count": number };
  mvhd: Mp4DumpBox & { duration: number; timescale: number };
  mehd: Mp4DumpBox & { "fragment duration": number };
  tkhd: Mp4DumpBox & { duration: number };
  mdhd: Mp4DumpBox & { duration: number; timescale: number };
}

export class Mp4Dump {
  static async dump(path: string): Promise<Mp4Dump> {
    const { stdout } = await execPromise(`mp4dump --format json "${path}"`);
    const parsed = JSON.parse(stdout);
    return new Mp4Dump(parsed as Mp4DumpBox[]);
  }

  constructor(private readonly boxes: Mp4DumpBox[]) { }

  fetchAll<T extends keyof Mp4DumpBoxes>(name: T, boxes?: Mp4DumpBox[]): Mp4DumpBoxes[T][];
  fetchAll(name: string, boxes?: Mp4DumpBox[]): Mp4DumpBox[];
  fetchAll(name: string, boxes: Mp4DumpBox[] = this.boxes): Mp4DumpBox[] {
    const found: Mp4DumpBox[] = [];
    for (const box of boxes) {
      if (box.name === name) {
        found.push(box);
      }
      if (box.children) {
        found.push(...this.fetchAll(name, box.children));
      }
    }
    return found;
  }

  fetchOne<T extends keyof Mp4DumpBoxes>(name: T): Mp4DumpBoxes[T] | undefined;
  fetchOne(name: string): Mp4DumpBox | undefined;
  fetchOne(name: string): Mp4DumpBox | undefined {
    const boxes = this.fetchAll(name);
    return boxes[0];
  }

  get ftyp() {
    return this.fetchAll("ftyp");
  }

  get moov() {
    return this.fetchAll("moov");
  }

  get moof() {
    return this.fetchAll("moof");
  }

  get mdat() {
    return this.fetchAll("mdat");
  }

  get mvhd() {
    return this.fetchOne("mvhd");
  }

  get mehd() {
    return this.fetchOne("mehd");
  }

  get tkhd() {
    return this.fetchAll("tkhd");
  }

  get mdhd() {
    return this.fetchAll("mdhd");
  }

  get totalSampleCount() {
    return this.fetchAll("trun").reduce((acc, trun) => acc + trun["sample count"], 0);
  }

  /**
   * Get the movie duration in seconds from mvhd box
   */
  get movieDurationSeconds(): number | undefined {
    const mvhd = this.mvhd;
    if (!mvhd || !mvhd.duration || !mvhd.timescale) return undefined;
    return mvhd.duration / mvhd.timescale;
  }

  /**
   * Get the fragment duration in seconds from mehd box (Movie Extends Header)
   * This is what players use to predict duration for fragmented MP4s
   */
  get fragmentDurationSeconds(): number | undefined {
    const mehd = this.mehd;
    const mvhd = this.mvhd;
    if (!mehd || !mvhd || !mvhd.timescale) return undefined;
    return mehd["fragment duration"] / mvhd.timescale;
  }

  /**
   * Get track durations in seconds
   */
  get trackDurations(): { trackId: number; duration: number }[] {
    const tracks: { trackId: number; duration: number }[] = [];
    const tkhds = this.tkhd;
    const mvhd = this.mvhd;

    if (!mvhd || !mvhd.timescale) return tracks;

    for (const tkhd of tkhds) {
      if (tkhd.duration !== undefined) {
        tracks.push({
          trackId: tkhd["track ID"] || 0,
          duration: tkhd.duration / mvhd.timescale
        });
      }
    }

    return tracks;
  }

  /**
   * Get media durations in seconds (from mdhd boxes)
   */
  get mediaDurations(): { duration: number; timescale: number }[] {
    const durations: { duration: number; timescale: number }[] = [];
    const mdhds = this.mdhd;

    for (const mdhd of mdhds) {
      if (mdhd.duration !== undefined && mdhd.timescale !== undefined) {
        durations.push({
          duration: mdhd.duration / mdhd.timescale,
          timescale: mdhd.timescale
        });
      }
    }

    return durations;
  }

  /**
   * Check if this is a fragmented MP4
   */
  get isFragmented(): boolean {
    // Fragmented MP4s have mvex (Movie Extends) box in moov
    const mvex = this.fetchAll("mvex");
    return mvex.length > 0;
  }

  /**
   * Get sequence numbers from moof boxes
   */
  get sequenceNumbers(): number[] {
    const mfhds = this.fetchAll("mfhd");
    return mfhds.map(mfhd => mfhd["sequence number"] || 0);
  }
}

/**
 * Extract duration metadata from MP4 file
 */
export async function extractMP4Metadata(filePath: string): Promise<{
  ffprobeDuration: number;
  movieDuration?: number;
  fragmentDuration?: number;
  trackDurations: { trackId: number; duration: number }[];
  mediaDurations: { duration: number; timescale: number }[];
  isFragmented: boolean;
  sequenceNumbers: number[];
}> {
  // Get ffprobe duration
  const { stdout: ffprobeOutput } = await execPromise(
    `ffprobe -v quiet -select_streams v:0 -show_entries format=duration -of csv=p=0 "${filePath}"`
  );
  const ffprobeDuration = parseFloat(ffprobeOutput.trim()) || 0;

  // Get box-level metadata
  const dump = await Mp4Dump.dump(filePath);

  return {
    ffprobeDuration,
    movieDuration: dump.movieDurationSeconds,
    fragmentDuration: dump.fragmentDurationSeconds,
    trackDurations: dump.trackDurations,
    mediaDurations: dump.mediaDurations,
    isFragmented: dump.isFragmented,
    sequenceNumbers: dump.sequenceNumbers
  };
}

/**
 * Verify duration consistency across different metadata sources
 */
export function verifyDurationConsistency(metadata: {
  ffprobeDuration: number;
  movieDuration?: number;
  fragmentDuration?: number;
  trackDurations: { trackId: number; duration: number }[];
  mediaDurations: { duration: number; timescale: number }[];
}, tolerance: number = 0.1): {
  isConsistent: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  const expectedDuration = metadata.ffprobeDuration;

  // Check movie duration (mvhd)
  if (metadata.movieDuration !== undefined) {
    const diff = Math.abs(metadata.movieDuration - expectedDuration);
    if (diff > tolerance) {
      issues.push(`Movie duration (${metadata.movieDuration}s) differs from expected (${expectedDuration}s) by ${diff}s`);
    }
  }

  // Check fragment duration (mehd) - this is critical for fragmented MP4s
  if (metadata.fragmentDuration !== undefined) {
    const diff = Math.abs(metadata.fragmentDuration - expectedDuration);
    if (diff > tolerance) {
      issues.push(`Fragment duration (${metadata.fragmentDuration}s) differs from expected (${expectedDuration}s) by ${diff}s`);
    }
  }

  // For fragmented MP4s (like working Chrome-compatible files), track/media durations should be 0
  // Only mvhd.duration should have the full duration
  for (const track of metadata.trackDurations) {
    if (track.duration !== 0) {
      issues.push(`Track ${track.trackId} duration should be 0 for fragmented MP4, but is ${track.duration}s`);
    }
  }

  // Check media durations should also be 0 for fragmented MP4
  for (let i = 0; i < metadata.mediaDurations.length; i++) {
    const media = metadata.mediaDurations[i];
    if (media && media.duration !== 0) {
      issues.push(`Media ${i} duration should be 0 for fragmented MP4, but is ${media.duration}s`);
    }
  }

  return {
    isConsistent: issues.length === 0,
    issues
  };
}
