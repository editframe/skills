import type { TrackFragmentIndex } from "@editframe/assets";
import type {
  ManifestResponse,
  ThumbnailResult,
} from "../../transcoding/types/index.js";
import type { UrlGenerator } from "../../transcoding/utils/UrlGenerator.js";
import { CachedFetcher, type FetchFn } from "./CachedFetcher.js";
import {
  type SegmentIndex,
  type TrackRef,
  type TrackSet,
  createFragmentIndex,
  createManifestIndex,
} from "./SegmentIndex.js";
import {
  type SegmentTransport,
  createByteRangeTransport,
  createUrlTransport,
} from "./SegmentTransport.js";
import {
  type TimingModel,
  createByteRangeTiming,
  createFragmentTiming,
  createJitTiming,
} from "./TimingModel.js";

export interface MediaEngine {
  readonly durationMs: number;
  readonly src: string;
  readonly index: SegmentIndex;
  readonly transport: SegmentTransport;
  readonly timing: TimingModel;
  readonly tracks: TrackSet;
  extractThumbnails(
    timestamps: number[],
    signal?: AbortSignal,
  ): Promise<(ThumbnailResult | null)[]>;
}

export function createMediaEngine(
  index: SegmentIndex,
  transport: SegmentTransport,
  timing: TimingModel,
  src: string,
): MediaEngine {
  return {
    durationMs: index.durationMs,
    src,
    index,
    transport,
    timing,
    tracks: index.tracks,

    async extractThumbnails(
      timestamps: number[],
      signal?: AbortSignal,
    ): Promise<(ThumbnailResult | null)[]> {
      const track = index.tracks.video ?? index.tracks.scrub;
      if (!track) {
        return timestamps.map(() => null);
      }

      // Use dynamic import to keep ThumbnailExtractor out of initial bundle
      const { ThumbnailExtractor } = await import(
        "./shared/ThumbnailExtractor.js"
      );
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const engine = this as MediaEngine;
      const extractor = new ThumbnailExtractor(engine);
      return extractor.extractThumbnails(
        timestamps,
        track,
        index.durationMs,
        signal,
      );
    },
  };
}

// ---------------------------------------------------------------------------
// Index data fetching
// ---------------------------------------------------------------------------

type IndexData =
  | {
      type: "fragment";
      data: Record<number, TrackFragmentIndex>;
      src: string;
      mode: "url" | "byteRange";
      apiHost?: string;
      fileId?: string;
      templates?: { initSegment: string; mediaSegment: string };
    }
  | {
      type: "manifest";
      data: ManifestResponse;
      src: string;
    };

export async function fetchFragmentIndex(
  fetchFn: FetchFn,
  url: string,
  signal?: AbortSignal,
): Promise<Record<number, TrackFragmentIndex>> {
  const fetcher = new CachedFetcher(fetchFn);
  return fetcher.fetchJson(url, signal);
}

export async function fetchFileIndex(
  fetchFn: FetchFn,
  fileId: string,
  apiHost: string,
  signal?: AbortSignal,
): Promise<Record<number, TrackFragmentIndex>> {
  const url = `${apiHost}/api/v1/files/${fileId}/index`;
  const response = await fetchFn(url, { signal });

  signal?.throwIfAborted();

  const contentType = response.headers.get("content-type");
  if (
    !response.ok ||
    (contentType && !contentType.includes("application/json"))
  ) {
    const text = await response.clone().text();
    if (!response.ok) {
      throw new Error(
        `Failed to fetch asset index: ${response.status} ${text}`,
      );
    }
    throw new Error(
      `Expected JSON but got ${contentType}: ${text.substring(0, 100)}`,
    );
  }

  try {
    const data = await response.json();
    signal?.throwIfAborted();
    return data as Record<number, TrackFragmentIndex>;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    throw new Error(
      `Failed to parse JSON response: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export async function validateTrackAccess(
  transport: SegmentTransport,
  tracks: TrackSet,
  requiredTracks: "audio" | "video" | "both",
  signal?: AbortSignal,
): Promise<void> {
  if (!signal) return;

  const toValidate: TrackRef[] = [];
  const needsVideo = requiredTracks === "video" || requiredTracks === "both";
  const needsAudio = requiredTracks === "audio" || requiredTracks === "both";

  if (needsVideo && tracks.video) toValidate.push(tracks.video);
  if (needsAudio && tracks.audio) toValidate.push(tracks.audio);

  for (const track of toValidate) {
    signal.throwIfAborted();
    try {
      await transport.fetchInitSegment(track, signal);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw error;
      }
      if (
        error instanceof Error &&
        (error.message.includes("401") ||
          error.message.includes("UNAUTHORIZED") ||
          (error.message.includes("Failed to fetch") &&
            error.message.includes("401")))
      ) {
        throw new Error(
          `${track.role} segments require authentication: ${error.message}`,
        );
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Engine composition from index data
// ---------------------------------------------------------------------------

function buildSourceUrl(src: string, baseUrl: string): string {
  if (src.startsWith("http://") || src.startsWith("https://")) {
    return src;
  }
  let base = baseUrl;
  if (!base) {
    base = typeof window !== "undefined" ? window.location.origin : "";
  }
  const normalizedSrc = src.startsWith("/") ? src : `/${src}`;
  return `${base}${normalizedSrc}`;
}

function buildEngineComponents(
  indexData: IndexData,
  fetcher: CachedFetcher,
  baseUrl: string,
): { index: SegmentIndex; transport: SegmentTransport; timing: TimingModel; src: string } {
  switch (indexData.type) {
    case "fragment": {
      const index = createFragmentIndex(indexData.data, indexData.src);

      if (indexData.mode === "byteRange") {
        const transport = createByteRangeTransport(
          indexData.data,
          indexData.fileId!,
          indexData.apiHost!,
          fetcher,
        );
        const timing = createByteRangeTiming(indexData.data);
        return { index, transport, timing, src: indexData.src };
      }

      const sourceUrl = buildSourceUrl(indexData.src, baseUrl);
      const jitBaseUrl = baseUrl || (typeof window !== "undefined" ? window.location.origin : "");
      const templates = {
        initSegment: `${jitBaseUrl}/api/v1/transcode/{rendition}/init.m4s?url=${encodeURIComponent(sourceUrl)}`,
        mediaSegment: `${jitBaseUrl}/api/v1/transcode/{rendition}/{segmentId}.m4s?url=${encodeURIComponent(sourceUrl)}`,
      };
      const transport = createUrlTransport({
        fetcher,
        src: sourceUrl,
        templates,
        audioTrackId: typeof index.tracks.audio?.id === "number" ? index.tracks.audio.id : undefined,
        videoTrackId: typeof index.tracks.video?.id === "number" ? index.tracks.video.id : undefined,
        segmentIdOffset: 1, // Fragment index uses 0-based IDs, JIT URLs expect 1-based
      });
      const timing = createFragmentTiming();
      return { index, transport, timing, src: indexData.src };
    }

    case "manifest": {
      const index = createManifestIndex(indexData.data);
      const transport = createUrlTransport({
        fetcher,
        src: indexData.data.sourceUrl,
        templates: indexData.data.endpoints,
        audioTrackId: undefined,
        videoTrackId: undefined,
      });
      const timing = createJitTiming();
      return { index, transport, timing, src: indexData.data.sourceUrl };
    }
  }
}

// ---------------------------------------------------------------------------
// Top-level factory — called by EFMedia.#createMediaEngine
// ---------------------------------------------------------------------------

export interface CreateMediaEngineOptions {
  src?: string | null;
  fileId?: string | null;
  apiHost?: string;
  requiredTracks: "audio" | "video" | "both";
  fetchFn: FetchFn;
  urlGenerator: UrlGenerator;
  mediaEnginePreference?: "jit" | "local" | "cloud";
  signal?: AbortSignal;
}

export async function createMediaEngineFromSource(
  opts: CreateMediaEngineOptions,
): Promise<MediaEngine | undefined> {
  const {
    src,
    fileId,
    apiHost,
    requiredTracks,
    fetchFn,
    urlGenerator,
    mediaEnginePreference,
    signal,
  } = opts;

  const fetcher = new CachedFetcher(fetchFn);
  const baseUrl = urlGenerator.getBaseUrl();

  let indexData: IndexData;

  // File-ID mode
  if (fileId !== null && fileId !== undefined && fileId.trim() !== "") {
    if (!apiHost) {
      throw new Error("API host is required for file-id mode");
    }
    const data = await fetchFileIndex(fetchFn, fileId, apiHost, signal);
    signal?.throwIfAborted();
    indexData = {
      type: "fragment",
      data,
      src: fileId,
      mode: "byteRange",
      apiHost,
      fileId,
    };
  } else if (!src || typeof src !== "string" || src.trim() === "") {
    return undefined;
  } else {
    const lowerSrc = src.toLowerCase();
    const isRemoteUrl =
      lowerSrc.startsWith("http://") || lowerSrc.startsWith("https://");

    if (mediaEnginePreference === "jit") {
      let manifestSrc = src;
      if (!isRemoteUrl && apiHost) {
        const base = apiHost.replace(/\/$/, "");
        const normalizedPath = src.replace(/^\.\//, "/src/");
        manifestSrc = `${base}${normalizedPath}`;
      }
      const url = urlGenerator.generateManifestUrl(manifestSrc);
      const manifest = await fetcher.fetchJson(url, signal);
      signal?.throwIfAborted();
      indexData = { type: "manifest", data: manifest, src: manifest.sourceUrl };
    } else if (mediaEnginePreference === "local" || !isRemoteUrl) {
      let normalizedSrc = src.startsWith("/") ? src.slice(1) : src;
      normalizedSrc = normalizedSrc.replace(/^\/+/, "");
      const apiBaseUrl = urlGenerator.getBaseUrl();
      const url = apiBaseUrl
        ? `${apiBaseUrl}/api/v1/files/index?src=${encodeURIComponent(normalizedSrc)}`
        : `/api/v1/files/index?src=${encodeURIComponent(normalizedSrc)}`;
      const data = await fetcher.fetchJson(url, signal);
      signal?.throwIfAborted();
      const finalSrc = src.startsWith("/") ? src.slice(1) : src;
      indexData = { type: "fragment", data, src: finalSrc, mode: "url" };
    } else {
      const url = urlGenerator.generateManifestUrl(src);
      const manifest = await fetcher.fetchJson(url, signal);
      signal?.throwIfAborted();
      indexData = { type: "manifest", data: manifest, src: manifest.sourceUrl };
    }
  }

  const { index, transport, timing, src: engineSrc } = buildEngineComponents(
    indexData,
    fetcher,
    baseUrl,
  );

  await validateTrackAccess(transport, index.tracks, requiredTracks, signal);

  return createMediaEngine(index, transport, timing, engineSrc);
}
