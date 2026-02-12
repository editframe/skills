import { logger } from "@/logging";
import { storageProvider } from "@/util/storageProvider.server";
import { isobmffIndexFilePath, isobmffTrackFilePath } from "@/util/filePaths";
import { executeSpan } from "@/tracing";
import type { JitManifest } from "@/render/jit-utils";

// Simplified bundle containing only the data actually used during rendering
export interface AssetsMetadataBundle {
  // Maps asset-id to complete fragment index JSON from /api/v1/isobmff_files/{id}/indexFile
  // This contains all the duration, codec, and seeking data needed for rendering
  fragmentIndexes: Record<string, Record<number, any>>;

  // JIT manifests for direct URL sources (when JIT_RENDER_MODE is enabled)
  // Maps source URL to JIT manifest with segment byte ranges
  jitManifests?: Record<string, JitManifest>;
}

/**
 * Extract media file IDs from getRenderInfo assets array
 * Only extracts video/audio assets that need fragment indexes
 * Assets are in format "file-id=uuid", "asset-id=uuid" (legacy), or "src=url"
 */
function extractMediaAssetIds(assetSrcs: string[]): string[] {
  return assetSrcs
    .filter((src) => src.startsWith("file-id=") || src.startsWith("asset-id="))
    .map((src) => src.replace("file-id=", "").replace("asset-id=", ""));
}

/**
 * Fetch fragment indexes for ISOBMFF files
 */
async function fetchFragmentIndexes(
  assetIds: string[],
  orgId: string,
): Promise<Record<string, Record<number, any>>> {
  return executeSpan("fetchFragmentIndexes", async () => {
    if (assetIds.length === 0) {
      return {};
    }

    logger.debug({ assetIds, orgId }, "Fetching fragment indexes");

    const fragmentIndexes: Record<string, Record<number, any>> = {};

    // Fetch each fragment index file
    for (const assetId of assetIds) {
      try {
        const indexPath = isobmffIndexFilePath({ org_id: orgId, id: assetId });
        const indexBuffer = await storageProvider.readFile(indexPath);

        // Parse the fragment index JSON
        const fragmentIndex = JSON.parse(indexBuffer.toString("utf-8"));
        fragmentIndexes[assetId] = fragmentIndex;

        logger.debug(
          { assetId, trackCount: Object.keys(fragmentIndex).length },
          "Loaded fragment index",
        );
      } catch (error) {
        logger.warn({ assetId, error }, "Failed to load fragment index");
        // Continue with other assets if one fails
      }
    }

    logger.debug(
      { indexCount: Object.keys(fragmentIndexes).length },
      "Fetched fragment indexes",
    );
    return fragmentIndexes;
  });
}

/**
 * Extract source URLs from getRenderInfo assets array
 * Only extracts URLs that are direct http/https sources (not asset-ids)
 */
function extractSourceUrls(assetSrcs: string[]): string[] {
  return assetSrcs
    .filter((src) => src.startsWith("src="))
    .map((src) => src.replace("src=", ""));
}

/**
 * Generate JIT manifests for source URLs
 * This probes each URL via byte-range requests to extract metadata
 */
async function generateJitManifests(
  sourceUrls: string[],
): Promise<Record<string, JitManifest>> {
  return executeSpan("generateJitManifests", async () => {
    if (sourceUrls.length === 0) {
      return {};
    }

    // Import JIT utilities dynamically to avoid circular dependencies
    const { probeSourceMetadata, generateJitManifest } = await import(
      "@/render/jit-utils"
    );

    logger.debug({ sourceUrls }, "Generating JIT manifests for source URLs");

    const jitManifests: Record<string, JitManifest> = {};

    // Generate manifest for each source URL
    for (const url of sourceUrls) {
      try {
        logger.debug({ url }, "Probing source URL for JIT manifest");

        // Probe the source to extract metadata
        const metadata = await probeSourceMetadata(url);

        // Note: We generate manifests for ALL codecs, not just WebCodecs compatible
        // The native decoder can handle codecs that WebCodecs cannot (e.g., HEVC)

        // Generate the JIT manifest with segment byte ranges
        const manifest = await generateJitManifest(metadata);
        jitManifests[url] = manifest;

        logger.debug(
          {
            url,
            durationMs: manifest.durationMs,
            videoSegments: manifest.videoTrack?.segments.length,
            audioSegments: manifest.audioTrack?.segments.length,
          },
          "Generated JIT manifest",
        );
      } catch (error) {
        logger.warn({ url, error }, "Failed to generate JIT manifest for URL");
        // Continue with other URLs if one fails
      }
    }

    logger.debug(
      { manifestCount: Object.keys(jitManifests).length },
      "Generated JIT manifests",
    );
    return jitManifests;
  });
}

/**
 * Convert fragment index to JIT manifest format.
 * The fragment index contains all the data needed for the native decoder.
 * 
 * @param assetId - The asset ID 
 * @param fragmentIndex - The fragment index data from ISOBMFF processing
 * @param orgId - The organization ID
 * @param trackUrls - Pre-computed download URLs for each track file
 */
export function fragmentIndexToJitManifest(
  assetId: string,
  fragmentIndex: Record<number, any>,
  orgId: string,
  trackUrls: Record<number, string>,
): JitManifest | null {
  // Find video and audio tracks
  let videoTrackIndex: any = null;
  let audioTrackIndex: any = null;
  let videoTrackId: number | null = null;
  let audioTrackId: number | null = null;
  
  for (const [trackIdStr, track] of Object.entries(fragmentIndex)) {
    const trackId = parseInt(trackIdStr, 10);
    if (track.type === "video" && !videoTrackIndex) {
      videoTrackIndex = track;
      videoTrackId = trackId;
    } else if (track.type === "audio" && !audioTrackIndex) {
      audioTrackIndex = track;
      audioTrackId = trackId;
    }
  }

  if (!videoTrackIndex && !audioTrackIndex) {
    return null;
  }

  // Convert fragment index segments to JIT segments
  // Fragment index uses cts (composition time stamp) and dts (decode time stamp)
  const convertSegments = (track: any, trackId: number) => {
    if (!track.segments || track.segments.length === 0) {
      return [];
    }
    
    const trackUrl = trackUrls[trackId];
    if (!trackUrl) {
      logger.warn({ trackId, assetId }, "No URL available for track");
      return [];
    }
    
    const timescale = track.timescale || 1;
    
    return track.segments.map((seg: any, index: number) => {
      // Use dts for timing (decode time stamp), fallback to cts if dts not available
      const startTime = seg.dts ?? seg.cts ?? 0;
      return {
        index,
        startMs: (startTime / timescale) * 1000,
        endMs: ((startTime + seg.duration) / timescale) * 1000,
        durationMs: (seg.duration / timescale) * 1000,
        startByte: seg.offset,
        endByte: seg.offset + seg.size,
        baseDecodeTimeUs: startTime * (1000000 / timescale),
        // Store the download URL for fetching
        sourceUrl: trackUrl,
      };
    });
  };

  // Calculate total duration
  const durationMs = Math.max(
    videoTrackIndex ? (videoTrackIndex.duration / videoTrackIndex.timescale) * 1000 : 0,
    audioTrackIndex ? (audioTrackIndex.duration / audioTrackIndex.timescale) * 1000 : 0,
  );

  // Use the video track URL as the main source URL (for init segment fetching)
  const mainTrackUrl = videoTrackId !== null ? trackUrls[videoTrackId] : 
                       audioTrackId !== null ? trackUrls[audioTrackId] : assetId;

  const manifest: JitManifest = {
    sourceUrl: mainTrackUrl, // Use the track URL as source for byte-range fetching
    durationMs,
    segmentDurationMs: 2000, // Default segment duration
    // Conservative: ISOBMFF sources may contain WebCodecs-incompatible codecs (HEVC, ProRes, etc.)
    isWebCodecsCompatible: false,
    isIsobmffSource: true, // Flag to indicate this is from ISOBMFF processing (no syntheticMp4)
  };

  if (videoTrackIndex && videoTrackId !== null) {
    manifest.videoTrack = {
      streamIndex: videoTrackId,
      type: "video",
      codec: videoTrackIndex.codec,
      durationMs: (videoTrackIndex.duration / videoTrackIndex.timescale) * 1000,
      timescale: videoTrackIndex.timescale,
      width: videoTrackIndex.width,
      height: videoTrackIndex.height,
      initSegment: {
        startByte: videoTrackIndex.initSegment?.offset || 0,
        endByte: (videoTrackIndex.initSegment?.offset || 0) + (videoTrackIndex.initSegment?.size || 0),
      },
      segments: convertSegments(videoTrackIndex, videoTrackId),
      // Note: extradata will be extracted from init segment when decoder session is created
    };
  }

  if (audioTrackIndex && audioTrackId !== null) {
    manifest.audioTrack = {
      streamIndex: audioTrackId,
      type: "audio",
      codec: audioTrackIndex.codec,
      durationMs: (audioTrackIndex.duration / audioTrackIndex.timescale) * 1000,
      timescale: audioTrackIndex.timescale,
      channels: audioTrackIndex.channel_count,
      sampleRate: audioTrackIndex.sample_rate,
      initSegment: {
        startByte: audioTrackIndex.initSegment?.offset || 0,
        endByte: (audioTrackIndex.initSegment?.offset || 0) + (audioTrackIndex.initSegment?.size || 0),
      },
      segments: convertSegments(audioTrackIndex, audioTrackId),
    };
  }

  return manifest;
}

/**
 * Generate JIT manifests for asset-id sources from fragment indexes.
 * Converts the existing fragment index data to JIT manifest format.
 * 
 * This also fetches signed download URLs for each track file so the
 * native decoder can access them via byte-range requests.
 */
async function generateJitManifestsForAssetIds(
  assetIds: string[],
  orgId: string,
  fragmentIndexes: Record<string, Record<number, any>>,
): Promise<Record<string, JitManifest>> {
  return executeSpan("generateJitManifestsForAssetIds", async () => {
    if (assetIds.length === 0) {
      return {};
    }

    logger.debug({ assetIds, orgId }, "Converting fragment indexes to JIT manifests");

    const jitManifests: Record<string, JitManifest> = {};

    for (const assetId of assetIds) {
      try {
        const fragmentIndex = fragmentIndexes[assetId];
        if (!fragmentIndex) {
          logger.warn({ assetId }, "No fragment index found for asset-id");
          continue;
        }

        // Get download URLs for each track file
        const trackIds = Object.keys(fragmentIndex).map(id => parseInt(id, 10));
        const trackUrls: Record<number, string> = {};
        
        for (const trackId of trackIds) {
          const trackPath = isobmffTrackFilePath({ org_id: orgId, id: assetId, track_id: trackId });
          try {
            const url = await storageProvider.getDownloadUrl(trackPath);
            trackUrls[trackId] = url;
            logger.debug({ assetId, trackId, url: url.substring(0, 100) + '...' }, "Got download URL for track");
          } catch (error) {
            logger.warn({ assetId, trackId, trackPath, error }, "Failed to get download URL for track");
          }
        }

        const manifest = fragmentIndexToJitManifest(assetId, fragmentIndex, orgId, trackUrls);
        if (!manifest) {
          logger.debug({ assetId }, "Could not convert fragment index to JIT manifest");
          continue;
        }
        
        jitManifests[assetId] = manifest;

        logger.debug(
          {
            assetId,
            durationMs: manifest.durationMs,
            videoSegments: manifest.videoTrack?.segments.length,
            audioSegments: manifest.audioTrack?.segments.length,
            sourceUrl: manifest.sourceUrl?.substring(0, 100) + '...',
          },
          "Converted fragment index to JIT manifest",
        );
      } catch (error) {
        logger.warn({ assetId, error }, "Failed to convert fragment index for asset-id");
      }
    }

    logger.debug(
      { manifestCount: Object.keys(jitManifests).length },
      "Converted fragment indexes to JIT manifests",
    );
    return jitManifests;
  });
}

/**
 * Create asset metadata bundle for rendering.
 * 
 * This generates JIT manifests for ALL video sources (both asset-id and URL sources).
 * The native decoder in Electron requires JIT manifests to function.
 * 
 * Fragment indexes are also included for backwards compatibility with WebCodecs path.
 */
export async function createAssetsMetadataBundle(
  assets: { efMediaSrcs: string[]; efImageSrcs: string[] },
  orgId: string,
  options?: { jitMode?: boolean },
): Promise<AssetsMetadataBundle> {
  return executeSpan("createAssetsMetadataBundle", async () => {
    logger.debug(
      { assets, orgId, jitMode: options?.jitMode },
      "Creating assets metadata bundle",
    );

    // Extract asset-ids and source URLs
    const mediaAssetIds = extractMediaAssetIds(assets.efMediaSrcs);
    const sourceUrls = extractSourceUrls(assets.efMediaSrcs);

    logger.debug(
      { mediaAssetIds, sourceUrls },
      "Extracted media sources",
    );

    // Fetch fragment indexes for asset-id sources (needed for backwards compat)
    const fragmentIndexes = await fetchFragmentIndexes(mediaAssetIds, orgId);

    // Generate JIT manifests for ALL sources
    // Native decoder requires these for proper functioning
    const jitManifests: Record<string, JitManifest> = {};

    // Generate manifests for URL sources
    if (sourceUrls.length > 0) {
      const urlManifests = await generateJitManifests(sourceUrls);
      Object.assign(jitManifests, urlManifests);
    }

    // Generate manifests for asset-id sources by probing ISOBMFF files
    if (mediaAssetIds.length > 0) {
      const assetManifests = await generateJitManifestsForAssetIds(
        mediaAssetIds,
        orgId,
        fragmentIndexes,
      );
      Object.assign(jitManifests, assetManifests);
    }

    const bundle: AssetsMetadataBundle = {
      fragmentIndexes,
      jitManifests: Object.keys(jitManifests).length > 0 ? jitManifests : undefined,
    };

    logger.debug(
      {
        fragmentIndexCount: Object.keys(fragmentIndexes).length,
        jitManifestCount: Object.keys(jitManifests).length,
      },
      "Created assets metadata bundle",
    );

    return bundle;
  });
}
