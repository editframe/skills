import { Task } from "@lit/task";
import { EF_INTERACTIVE } from "../../../EF_INTERACTIVE";
import type { MediaEngine } from "../../../transcoding/types";
import type { EFMedia } from "../../EFMedia";
import { AssetIdMediaEngine } from "../AssetIdMediaEngine";
import { AssetMediaEngine } from "../AssetMediaEngine";
import { JitMediaEngine } from "../JitMediaEngine";

export const getLatestMediaEngine = async (
  host: EFMedia,
  signal: AbortSignal,
): Promise<MediaEngine> => {
  let mediaEngine;
  try {
    mediaEngine = await host.mediaEngineTask.taskComplete;
  } catch (error) {
    // If the error is "No valid media source", re-throw it so callers can handle it
    if (error instanceof Error && error.message === "No valid media source") {
      throw error;
    }
    // For other errors, wrap them
    throw error;
  }
  signal.throwIfAborted();
  if (!mediaEngine) {
    throw new Error("Media engine is not available");
  }
  return mediaEngine;
};

/**
 * Core logic for creating a MediaEngine with explicit dependencies.
 * Pure function that requires all dependencies to be provided.
 */
export const createMediaEngine = (host: EFMedia): Promise<MediaEngine> => {
  const { src, assetId, urlGenerator, apiHost } = host;

  // Check for AssetID mode first
  if (assetId !== null && assetId !== undefined && assetId.trim() !== "") {
    if (!apiHost) {
      return Promise.reject(new Error("API host is required for AssetID mode"));
    }
    return AssetIdMediaEngine.fetchByAssetId(
      host,
      urlGenerator,
      assetId,
      apiHost,
    );
  }

  // Check for null/undefined/empty/whitespace src
  if (!src || typeof src !== "string" || src.trim() === "") {
    console.error(`Unsupported media source: ${src}, assetId: ${assetId}`);
    return Promise.reject(new Error("Unsupported media source"));
  }

  const lowerSrc = src.toLowerCase();
  const isRemoteUrl = lowerSrc.startsWith("http://") || lowerSrc.startsWith("https://");
  
  // Check configuration for explicit engine preference
  const configuration = host.closest("ef-configuration");
  
  // "jit" mode: Force JitMediaEngine for all sources (including local files)
  if (configuration?.mediaEngine === "jit") {
    // For local paths, convert to full URL using apiHost
    let manifestSrc = src;
    if (!isRemoteUrl && configuration.apiHost) {
      // Convert relative path to absolute URL for the JIT manifest
      // e.g., "./assets/video.mp4" -> "http://main.localhost:4321/src/assets/video.mp4"
      const baseUrl = configuration.apiHost.replace(/\/$/, "");
      const normalizedPath = src.replace(/^\.\//, "/src/");
      manifestSrc = `${baseUrl}${normalizedPath}`;
    }
    const url = urlGenerator.generateManifestUrl(manifestSrc);
    return JitMediaEngine.fetch(host, urlGenerator, url);
  }
  
  // "local" mode: Force AssetMediaEngine for all sources
  if (configuration?.mediaEngine === "local") {
    return AssetMediaEngine.fetch(host, urlGenerator, src);
  }
  
  // "cloud" mode (default): AssetMediaEngine for local paths, JitMediaEngine for remote URLs
  if (!isRemoteUrl) {
    return AssetMediaEngine.fetch(host, urlGenerator, src);
  }

  // Default: Use JitMediaEngine for remote URLs (transcoding service)
  const url = urlGenerator.generateManifestUrl(src);
  return JitMediaEngine.fetch(host, urlGenerator, url);
};

/**
 * Handle completion of media engine task - triggers necessary updates.
 * Extracted for testability.
 */
export const handleMediaEngineComplete = (host: EFMedia): void => {
  host.requestUpdate("intrinsicDurationMs");
  host.requestUpdate("ownCurrentTimeMs");
  host.rootTimegroup?.requestUpdate("ownCurrentTimeMs");
  host.rootTimegroup?.requestUpdate("durationMs");
};

type MediaEngineTask = Task<readonly [string, string | null], MediaEngine>;

export const makeMediaEngineTask = (host: EFMedia): MediaEngineTask => {
  return new Task(host, {
    autoRun: EF_INTERACTIVE,
    args: () => [host.src, host.assetId] as const,
    task: async () => {
      // Check if we have a valid source before attempting to create media engine
      // This avoids unnecessary errors when src is empty/null/undefined
      const { src, assetId } = host;
      
      // If we have a valid assetId, proceed
      if (assetId !== null && assetId !== undefined && assetId.trim() !== "") {
        return createMediaEngine(host);
      }
      
      // If we don't have a valid src, don't attempt to create media engine
      if (!src || typeof src !== "string" || src.trim() === "") {
        // Return a rejected promise to indicate no valid source
        // This prevents the error from being logged since we're handling it explicitly
        return Promise.reject(new Error("No valid media source"));
      }
      
      return createMediaEngine(host);
    },
    onComplete: (_value) => {
      handleMediaEngineComplete(host);
    },
  });
};
