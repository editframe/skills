import * as fs from "node:fs/promises";
import * as path from "node:path";

type MP4Box = {
  type: string;
  size: number;
  start: number;
  end: number;
  data: Uint8Array;
};

export type MoovCacheEntry = {
  url: string;
  ftyp: Uint8Array | null;
  moov: Uint8Array | null;
  totalSize: number;
  mdatOffset: number | null; // Offset where mdat starts in original file
  interveningBoxes: Uint8Array | null; // Bytes between moov and mdat (free, uuid, etc.)
};

const HEAD_BYTES = 1024 * 1024;
const TAIL_BYTES = 1024 * 1024;
const TAIL_SLOP = 1024;

/**
 * Determine if a URL refers to a local file
 */
function isLocalFile(url: string): boolean {
  // Check for file:// protocol
  if (url.startsWith("file://")) {
    return true;
  }

  // Check for HTTP/HTTPS protocols (these are definitely remote)
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return false;
  }

  // For everything else, assume it's a local file path
  // This includes relative paths, absolute paths, etc.
  return true;
}

/**
 * Convert file:// URL or local path to file system path
 */
function urlToPath(url: string): string {
  if (url.startsWith("file://")) {
    const urlObj = new URL(url);
    if (urlObj.protocol !== "file:") {
      throw new Error(`Expected file:// protocol, got: ${urlObj.protocol}`);
    }
    return urlObj.pathname;
  }
  return path.resolve(url);
}

/**
 * Generic box parser that works on any Uint8Array buffer
 */
function* parseBoxesFromBuffer(
  buffer: Uint8Array,
  baseOffset = 0,
): Generator<MP4Box> {
  let processedOffset = 0;

  while (processedOffset + 8 <= buffer.length) {
    const view = new DataView(
      buffer.buffer,
      buffer.byteOffset + processedOffset,
      8,
    );
    const size = view.getUint32(0);
    const type = new TextDecoder().decode(
      buffer.slice(processedOffset + 4, processedOffset + 8),
    );

    if (size < 8) {
      // Invalid box size, skip one byte and try again
      processedOffset++;
      continue;
    }

    if (processedOffset + size > buffer.length) {
      // Not enough data for the full box
      break;
    }

    yield {
      type,
      size,
      start: baseOffset + processedOffset,
      end: baseOffset + processedOffset + size,
      data: buffer.slice(processedOffset, processedOffset + size),
    };

    processedOffset += size;
  }
}

/**
 * Generic function to find MOOV box in a buffer
 */
function findMoovInBuffer(buffer: Uint8Array): Uint8Array | null {
  const moovSignature = [0x6d, 0x6f, 0x6f, 0x76]; // 'moov' in ASCII

  // Scan the entire buffer byte by byte
  for (let i = 0; i < buffer.length - 8; i++) {
    // Check for 'moov' signature
    if (
      buffer[i + 4] === moovSignature[0] &&
      buffer[i + 5] === moovSignature[1] &&
      buffer[i + 6] === moovSignature[2] &&
      buffer[i + 7] === moovSignature[3]
    ) {
      // Get the box size
      const size = new DataView(
        buffer.buffer,
        buffer.byteOffset + i,
        4,
      ).getUint32(0);

      // Validate box size
      if (size >= 8 && i + size <= buffer.length) {
        return buffer.slice(i, i + size);
      }
    }
  }

  return null;
}

async function* streamBoxesFromFetch(
  url: string,
  start: number,
  end: number,
  baseOffset = 0,
): AsyncGenerator<MP4Box> {
  const abortController = new AbortController();
  const rangeHeader = `bytes=${start}-${end - 1}`;

  console.log(
    `[streamBoxesFromFetch] Requesting range: ${rangeHeader} from ${url}`,
  );

  const res = await fetch(url, {
    headers: { Range: rangeHeader },
    signal: abortController.signal,
  });

  console.log(
    `[streamBoxesFromFetch] Response status: ${res.status} ${res.statusText}`,
  );

  if (!res.ok)
    throw new Error(`Failed to fetch range ${start}-${end}: ${res.status}`);

  // Check if server actually honored the range request
  const contentRange = res.headers.get("content-range");
  const contentLength = res.headers.get("content-length");
  console.log(
    `[streamBoxesFromFetch] Response - Content-Range: ${contentRange || "none"}, Content-Length: ${contentLength || "none"}`,
  );

  // CRITICAL: Fail immediately if server doesn't support range requests
  if (res.status === 200) {
    // Server returned 200 OK instead of 206 Partial Content - it's ignoring our range request
    throw new Error(
      `Server does not support range requests. ` +
        `Expected 206 Partial Content, got ${res.status} ${res.statusText}. ` +
        `This would download the entire file (${contentLength || "unknown size"} bytes) instead of the requested range.`,
    );
  }

  if (res.status !== 206) {
    throw new Error(
      `Unexpected response status for range request: ${res.status} ${res.statusText}`,
    );
  }

  if (!contentRange) {
    throw new Error(
      `Server returned 206 but missing Content-Range header. ` +
        `Cannot verify that range request was properly handled.`,
    );
  }

  const reader = res.body!.getReader();

  let buffer = new Uint8Array(0);
  let processedOffset = 0;
  let totalBytesReceived = 0;
  let shouldStopEarly = false;

  try {
    while (true && !shouldStopEarly) {
      const { done, value } = await reader.read();

      if (done) {
        console.log(
          `[streamBoxesFromFetch] Stream complete. Total bytes received: ${totalBytesReceived}, requested range: ${start}-${end - 1}`,
        );
        break;
      }

      totalBytesReceived += value.length;

      // Append new data to our buffer
      const newBuffer = new Uint8Array(buffer.length + value.length);
      newBuffer.set(buffer);
      newBuffer.set(value, buffer.length);
      buffer = newBuffer;

      // Try to extract boxes from the buffer
      while (processedOffset + 8 <= buffer.length && !shouldStopEarly) {
        const view = new DataView(
          buffer.buffer,
          buffer.byteOffset + processedOffset,
          8,
        );
        const size = view.getUint32(0);
        const type = new TextDecoder().decode(
          buffer.slice(processedOffset + 4, processedOffset + 8),
        );

        if (size < 8) {
          // Invalid box size, skip one byte and try again
          processedOffset++;
          continue;
        }

        // Special handling for large boxes like mdat - we only need the position, not content
        if (type === "mdat" || size > 1024 * 1024) {
          // For large boxes, just yield the header info and let the caller decide what to do
          yield {
            type,
            size,
            start: baseOffset + processedOffset,
            end: baseOffset + processedOffset + size,
            data: buffer.slice(processedOffset, processedOffset + 8), // Just the 8-byte header
          };

          // Don't try to read the rest of a large box - advance past the header only
          processedOffset += 8;

          // If this is mdat, we typically want to stop processing to avoid downloading huge amounts of data
          if (type === "mdat") {
            console.log(
              `[streamBoxesFromFetch] Found large mdat box (${size} bytes), aborting HTTP request to avoid downloading video data`,
            );
            shouldStopEarly = true; // Signal to stop the stream reading loop
            abortController.abort(); // THIS LINE: Actually abort the HTTP request
          }
          continue;
        }

        if (processedOffset + size > buffer.length) {
          // Not enough data yet for the full box
          break;
        }

        yield {
          type,
          size,
          start: baseOffset + processedOffset,
          end: baseOffset + processedOffset + size,
          data: buffer.slice(processedOffset, processedOffset + size),
        };

        processedOffset += size;
      }

      // Compact the buffer if we've processed a significant portion
      if (processedOffset > 0) {
        buffer = buffer.slice(processedOffset);
        baseOffset += processedOffset; // Update baseOffset to account for processed bytes
        processedOffset = 0;
      }
    }

    if (shouldStopEarly) {
      console.log(
        `[streamBoxesFromFetch] Early termination activated. Total bytes received: ${totalBytesReceived}, requested range: ${start}-${end - 1}`,
      );
    }
  } catch (error) {
    // Handle abort signal - this is expected when we abort the request early
    if (error instanceof Error && error.name === "AbortError") {
      console.log(
        `[streamBoxesFromFetch] Request aborted after processing ${totalBytesReceived} bytes (expected - found mdat)`,
      );
    } else {
      throw error; // Re-throw other errors
    }
  } finally {
    reader.releaseLock();
  }
}

async function* streamBoxesFromFile(
  filePath: string,
  start: number,
  end: number,
  baseOffset = 0,
): AsyncGenerator<MP4Box> {
  const fileHandle = await fs.open(filePath, "r");

  try {
    const readSize = end - start;
    const buffer = Buffer.allocUnsafe(readSize);

    const { bytesRead } = await fileHandle.read(buffer, 0, readSize, start);
    const data = new Uint8Array(buffer.subarray(0, bytesRead));

    // Use the generic box parser
    for (const box of parseBoxesFromBuffer(data, baseOffset)) {
      yield box;
    }
  } finally {
    await fileHandle.close();
  }
}

async function scanForMoovInTail(
  url: string,
  fileSize: number,
): Promise<Uint8Array | null> {
  const start = Math.max(0, fileSize - TAIL_BYTES - TAIL_SLOP);
  const end = fileSize;

  const res = await fetch(url, {
    headers: { Range: `bytes=${start}-${end - 1}` },
  });
  if (!res.ok) return null;

  const buffer = new Uint8Array(await res.arrayBuffer());
  return findMoovInBuffer(buffer);
}

async function scanForMoovInTailFile(
  filePath: string,
  fileSize: number,
): Promise<Uint8Array | null> {
  const start = Math.max(0, fileSize - TAIL_BYTES - TAIL_SLOP);
  const end = fileSize;

  const fileHandle = await fs.open(filePath, "r");
  try {
    const readSize = end - start;
    const buffer = Buffer.allocUnsafe(readSize);

    const { bytesRead } = await fileHandle.read(buffer, 0, readSize, start);
    const data = new Uint8Array(buffer.subarray(0, bytesRead));

    return findMoovInBuffer(data);
  } finally {
    await fileHandle.close();
  }
}

export async function fetchMoovAndFtyp(url: string): Promise<MoovCacheEntry> {
  // Test range request support with HEAD request first to fail fast
  console.log(`[fetchMoovAndFtyp] Testing range request support for: ${url}`);
  const headRes = await fetch(url, {
    method: "HEAD",
    headers: { Range: "bytes=0-" }, // Test if server supports range requests
  });

  if (!headRes.ok) {
    throw new Error(
      `Failed to test range request support for ${url}: ${headRes.status} ${headRes.statusText}`,
    );
  }

  console.log(
    `[fetchMoovAndFtyp] HEAD response: ${headRes.status} ${headRes.statusText}`,
  );

  const acceptRanges = headRes.headers.get("accept-ranges");
  const explicitlySupportsRange = acceptRanges === "bytes";
  // Server returned 200 instead of 206 - doesn't support range requests
  const implicitlySupportsRange = headRes.status === 206;

  // Check if server supports range requests
  if (!(explicitlySupportsRange || implicitlySupportsRange)) {
    throw new Error(
      `Server does not support HTTP range requests. ` +
        `HEAD request with Range header returned ${headRes.status} instead of 206. ` +
        `Accept-Ranges: ${acceptRanges || "[NOT PRESENT]"}` +
        `Cannot efficiently extract metadata without downloading entire file.`,
    );
  }

  console.log(`[fetchMoovAndFtyp] ✅ Server supports range requests (got 206)`);

  const contentLength = headRes.headers.get("content-length");
  const contentRange = headRes.headers.get("content-range");
  const size = contentLength ? Number.parseInt(contentLength, 10) : 0;

  console.log(
    `[fetchMoovAndFtyp] Content-Range: ${contentRange || "none"}, Content-Length: ${contentLength || "none"}`,
  );

  // Extract total file size from Content-Range if available (format: "bytes 0-1048575/62956262")
  let totalFileSize = size;
  if (contentRange) {
    const match = contentRange.match(/bytes \d+-\d+\/(\d+)/);
    if (match) {
      totalFileSize = Number.parseInt(match[1], 10);
      console.log(
        `[fetchMoovAndFtyp] Total file size from Content-Range: ${totalFileSize} bytes`,
      );
    }
  }

  let ftyp: Uint8Array | null = null;
  let moov: Uint8Array | null = null;
  let mdatOffset: number | null = null;
  let moovEndOffset: number | null = null;
  let interveningBoxes: Uint8Array | null = null;

  // First try to get boxes from the head of the file
  const headFetch = async () => {
    console.log(
      `[fetchMoovAndFtyp] Attempting to fetch first ${HEAD_BYTES} bytes from ${url}`,
    );
    try {
      const foundBoxes: string[] = [];
      let totalBytesProcessed = 0;
      const interveningBoxData: Uint8Array[] = [];
      for await (const box of streamBoxesFromFetch(url, 0, HEAD_BYTES, 0)) {
        foundBoxes.push(`${box.type}@${box.start}-${box.end}`);
        totalBytesProcessed = Math.max(totalBytesProcessed, box.end);

        if (box.type === "ftyp" && !ftyp) {
          ftyp = box.data;
          console.log(
            `[fetchMoovAndFtyp] Found ftyp box: ${box.start}-${box.end}`,
          );
        }
        if (box.type === "moov" && !moov) {
          moov = box.data;
          moovEndOffset = box.end;
          console.log(
            "[fetchMoovAndFtyp] Found moov box:",
            box.start + "-" + box.end,
            "(size:",
            box.data.length + ")",
          );
        }
        if (box.type === "mdat" && mdatOffset === null) {
          mdatOffset = box.start;
          console.log("[fetchMoovAndFtyp] Found mdat box at:", box.start);
        }
        // Collect intervening boxes (free, uuid, skip, etc.) between moov and mdat
        if (
          moovEndOffset !== null &&
          box.start >= moovEndOffset &&
          (mdatOffset === null || box.start < mdatOffset)
        ) {
          console.log(
            "[fetchMoovAndFtyp] Found intervening box:",
            box.type,
            "at:",
            box.start + "-" + box.end,
            "(size:",
            box.data.length + ")",
          );
          interveningBoxData.push(box.data);
        }

        // OPTIMIZATION: Stop processing once we have all required boxes and intervening data
        if (ftyp && moov && mdatOffset !== null) {
          console.log(
            "[fetchMoovAndFtyp] Found all required boxes, stopping early to avoid unnecessary downloads",
          );
          break;
        }
      }

      // After processing all boxes, extract intervening boxes if we have both moov and mdat
      console.log(
        "[fetchMoovAndFtyp] Processing complete. Boxes found:",
        foundBoxes.join(", "),
      );
      console.log(
        "[fetchMoovAndFtyp] Total bytes processed:",
        totalBytesProcessed,
        "/ 1MB target",
      );
      console.log(
        "[fetchMoovAndFtyp] ftyp:",
        !!ftyp,
        "moov:",
        !!moov,
        "mdatOffset:",
        mdatOffset,
      );

      if (ftyp && moov && mdatOffset !== null && moovEndOffset !== null) {
        console.log(
          "[fetchMoovAndFtyp] Found both ftyp, moov, and mdat - processing intervening boxes",
        );
        const interveningLength = mdatOffset - moovEndOffset;
        console.log(
          `[fetchMoovAndFtyp] Intervening length: ${interveningLength} (moovEnd: ${moovEndOffset}, mdatStart: ${mdatOffset})`,
        );

        if (interveningBoxData.length > 0) {
          // Concatenate all intervening box data
          const totalLength = interveningBoxData.reduce(
            (sum, data) => sum + data.length,
            0,
          );
          interveningBoxes = new Uint8Array(totalLength);
          let offset = 0;
          for (const data of interveningBoxData) {
            interveningBoxes.set(data, offset);
            offset += data.length;
          }
          console.log(
            `[fetchMoovAndFtyp] Successfully assembled ${interveningBoxes.length} intervening bytes from ${interveningBoxData.length} boxes`,
          );
        } else if (interveningLength > 0) {
          console.log(
            `[fetchMoovAndFtyp] No intervening boxes found in stream, but ${interveningLength} bytes expected between moov and mdat`,
          );
          // This might happen if the stream ended early or boxes weren't properly parsed
          interveningBoxes = new Uint8Array(0);
        } else {
          console.log(
            "[fetchMoovAndFtyp] No intervening boxes (moov and mdat are adjacent)",
          );
          interveningBoxes = new Uint8Array(0);
        }
        return true;
      }
      console.log(
        "[fetchMoovAndFtyp] Missing required boxes - cannot extract intervening data",
      );
      return ftyp !== null && moov !== null; // Return true if we at least have ftyp and moov
    } catch (e) {
      console.error("[fetchMoovAndFtyp] Error fetching head:", e);
    }
    return false;
  };

  // Only try tail scanning if we have a file size and haven't found moov yet
  const tailFetch = async () => {
    if (!totalFileSize) {
      console.warn(
        "No total file size available, skipping tail scan for:",
        url,
      );
      return false;
    }

    try {
      const tailMoov = await scanForMoovInTail(url, totalFileSize);
      if (tailMoov && !moov) {
        moov = tailMoov;

        // For tail-moov files, we need to find where mdat starts (typically after ftyp)
        // If we have ftyp but no mdatOffset yet, assume mdat starts right after ftyp
        if (ftyp && mdatOffset === null) {
          mdatOffset = ftyp.length;

          // For tail-moov files, intervening boxes are between mdat and moov
          // Since moov is at the end, intervening boxes would be all the non-video data
          // between mdat header and moov. For now, we'll leave this as null since
          // extracting this would require parsing the entire file structure
          interveningBoxes = null;
        }

        return true;
      }
    } catch (e) {
      console.error("Error scanning tail:", e);
    }
    return false;
  };

  // Try head first
  const headSuccess = await headFetch();

  console.log(
    `[fetchMoovAndFtyp] HEAD FETCH RESULT: headSuccess=${headSuccess}, ftyp=${!!ftyp}, moov=${!!moov}, totalFileSize=${totalFileSize}`,
  );

  // If we have both ftyp and moov from head, we're done
  if (headSuccess && ftyp && moov) {
    console.log(
      "[fetchMoovAndFtyp] SUCCESS: Found required boxes in head fetch, returning early",
    );
    return {
      url,
      totalSize: totalFileSize,
      ftyp,
      moov,
      mdatOffset,
      interveningBoxes,
    };
  }

  // If we have a file size but missing moov, try tail
  if (totalFileSize && !moov) {
    console.log(
      "[fetchMoovAndFtyp] Trying tail fetch because we have file size but no moov",
    );
    await tailFetch();
  }

  // If we still don't have moov and no total file size, try larger head chunks
  if (!moov && !totalFileSize) {
    console.log(
      "[fetchMoovAndFtyp] WARNING: Falling back to larger head chunks - this will download more data!",
    );
    console.log(
      "No moov found in first 1MB and no total file size, trying larger head chunk",
    );

    const largeHeadFetch = async (chunkSize: number) => {
      try {
        const foundBoxes: string[] = [];
        for await (const box of streamBoxesFromFetch(url, 0, chunkSize, 0)) {
          foundBoxes.push(`${box.type}@${box.start}-${box.end}`);

          if (box.type === "moov" && !moov) {
            moov = box.data;
            moovEndOffset = box.end;
            console.log(`Found moov box at ${box.start}-${box.end}`);
          }
          if (box.type === "mdat" && mdatOffset === null) {
            mdatOffset = box.start;
            console.log(`Found mdat box at ${box.start}`);
          }
        }

        console.log(
          `Boxes found in ${chunkSize} byte chunk: ${foundBoxes.join(", ")}`,
        );

        // Extract intervening boxes if we have both moov and mdat
        if (moov && mdatOffset !== null && moovEndOffset !== null) {
          const interveningLength = mdatOffset - moovEndOffset;
          if (interveningLength > 0) {
            console.log(
              `Extracting ${interveningLength} intervening bytes between moov and mdat`,
            );
            try {
              const interveningRes = await fetch(url, {
                headers: { Range: `bytes=${moovEndOffset}-${mdatOffset - 1}` },
              });
              if (interveningRes.ok) {
                interveningBoxes = new Uint8Array(
                  await interveningRes.arrayBuffer(),
                );
                console.log(
                  `Successfully extracted ${interveningBoxes.length} intervening bytes`,
                );
              }
            } catch (e) {
              console.warn("Error fetching intervening boxes:", e);
            }
          } else {
            console.log(
              "No intervening boxes needed (moov and mdat are adjacent)",
            );
          }
        } else {
          console.log(
            `Cannot extract intervening boxes: moov=${!!moov}, mdatOffset=${mdatOffset}, moovEndOffset=${moovEndOffset}`,
          );
        }

        return moov !== null;
      } catch (e) {
        console.error(`Error fetching ${chunkSize} byte head chunk:`, e);
      }
      return false;
    };

    // Try progressively larger chunks, but keep them reasonable since 1MB should cover most moov boxes
    const chunkSizes = [2 * 1024 * 1024]; // Just try 2MB if 1MB wasn't enough

    for (const chunkSize of chunkSizes) {
      if (moov) break;

      console.log(
        `Trying ${chunkSize / (1024 * 1024)}MB head chunk for moov box`,
      );
      await largeHeadFetch(chunkSize);
    }
  }

  return {
    url,
    totalSize: totalFileSize,
    ftyp,
    moov,
    mdatOffset,
    interveningBoxes,
  };
}

export async function fetchLocalMoovAndFtyp(
  url: string,
): Promise<MoovCacheEntry> {
  const filePath = urlToPath(url);

  const stats = await fs.stat(filePath);
  if (!stats.isFile()) {
    throw new Error(`Path is not a file: ${filePath}`);
  }

  const fileSize = stats.size;

  const headFetch = async () => {
    const result: {
      ftyp: Uint8Array | null;
      moov: Uint8Array | null;
      mdatOffset: number | null;
    } = {
      ftyp: null,
      moov: null,
      mdatOffset: null,
    };

    for await (const box of streamBoxesFromFile(filePath, 0, HEAD_BYTES, 0)) {
      if (box.type === "ftyp") {
        result.ftyp = box.data;
      } else if (box.type === "moov") {
        result.moov = box.data;
      } else if (box.type === "mdat" && result.mdatOffset === null) {
        result.mdatOffset = box.start;
      }

      // If we have both, we can stop
      if (result.ftyp && result.moov) {
        break;
      }
    }

    return result;
  };

  const tailFetch = async () => {
    const moov = await scanForMoovInTailFile(filePath, fileSize);
    return { moov };
  };

  // Try head first, then tail if needed
  const headResult = await headFetch();

  let moov = headResult.moov;
  if (!moov) {
    const tailResult = await tailFetch();
    moov = tailResult.moov;
  }

  return {
    url,
    ftyp: headResult.ftyp,
    moov,
    totalSize: fileSize,
    mdatOffset: headResult.mdatOffset,
    interveningBoxes: null, // For local files, we don't collect intervening boxes for now
  };
}

/**
 * Unified function to fetch MOOV and FTYP boxes from either HTTP or local files
 */
export async function fetchMoovAndFtypUnified(
  url: string,
): Promise<MoovCacheEntry> {
  if (isLocalFile(url)) {
    return fetchLocalMoovAndFtyp(url);
  }

  return fetchMoovAndFtyp(url);
}

export function createDummyMdat(size = 8): Uint8Array {
  if (size < 8) throw new Error("mdat size must be at least 8 bytes");

  const buffer = new Uint8Array(size);
  const view = new DataView(buffer.buffer);

  // Box size (big-endian)
  view.setUint32(0, size);

  // Box type 'mdat'
  buffer[4] = 0x6d; // 'm'
  buffer[5] = 0x64; // 'd'
  buffer[6] = 0x61; // 'a'
  buffer[7] = 0x74; // 't'

  // The rest is just dummy data (already zero-initialized)
  return buffer;
}

export function buildFakeMp4(
  ftyp: Uint8Array,
  moov: Uint8Array,
  mdatSize = 8,
): Uint8Array {
  if (!ftyp || !moov) throw new Error("Both ftyp and moov boxes are required");

  const mdat = createDummyMdat(mdatSize);
  const totalSize = ftyp.length + moov.length + mdat.length;

  const buffer = new Uint8Array(totalSize);
  let offset = 0;

  buffer.set(ftyp, offset);
  offset += ftyp.length;

  buffer.set(moov, offset);
  offset += moov.length;

  buffer.set(mdat, offset);

  return buffer;
}

/**
 * Build a synthetic MP4 that preserves the exact file structure between moov and mdat.
 * This ensures sample table positions remain correct without offset calculations.
 */
export function buildFakeMp4WithPreservedStructure(
  ftyp: Uint8Array,
  moov: Uint8Array,
  interveningBoxes: Uint8Array,
  mdatSize = 8,
): Uint8Array {
  if (!ftyp || !moov) throw new Error("Both ftyp and moov boxes are required");

  const mdat = createDummyMdat(mdatSize);
  const totalSize =
    ftyp.length + moov.length + interveningBoxes.length + mdat.length;

  const buffer = new Uint8Array(totalSize);
  let offset = 0;

  buffer.set(ftyp, offset);
  offset += ftyp.length;

  buffer.set(moov, offset);
  offset += moov.length;

  buffer.set(interveningBoxes, offset);
  offset += interveningBoxes.length;

  buffer.set(mdat, offset);

  return buffer;
}

/**
 * Reconstruct a valid MP4 from segment data
 * Takes ftyp, moov boxes and raw segment bytes, creates a proper MP4 container
 */
export function buildMp4FromSegment(
  ftyp: Uint8Array,
  moov: Uint8Array,
  segmentData: Uint8Array,
): Uint8Array {
  if (!ftyp || !moov) throw new Error("Both ftyp and moov boxes are required");
  if (!segmentData || segmentData.length === 0)
    throw new Error("Segment data is required");

  // Create mdat header for the segment data
  const mdatHeaderSize = 8;
  const mdatSize = mdatHeaderSize + segmentData.length;
  const mdatHeader = new Uint8Array(mdatHeaderSize);
  const mdatView = new DataView(mdatHeader.buffer);

  // Set mdat box size (big-endian)
  mdatView.setUint32(0, mdatSize);

  // Set mdat box type 'mdat'
  mdatHeader[4] = 0x6d; // 'm'
  mdatHeader[5] = 0x64; // 'd'
  mdatHeader[6] = 0x61; // 'a'
  mdatHeader[7] = 0x74; // 't'

  // Calculate total size and create buffer
  const totalSize = ftyp.length + moov.length + mdatSize;
  const buffer = new Uint8Array(totalSize);
  let offset = 0;

  // Copy ftyp box
  buffer.set(ftyp, offset);
  offset += ftyp.length;

  // Copy moov box without modification
  buffer.set(moov, offset);
  offset += moov.length;

  // Copy mdat header
  buffer.set(mdatHeader, offset);
  offset += mdatHeaderSize;

  // Copy segment data
  buffer.set(segmentData, offset);

  return buffer;
}
