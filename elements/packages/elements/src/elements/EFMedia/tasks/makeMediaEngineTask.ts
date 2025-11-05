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
  const mediaEngine = await host.mediaEngineTask.taskComplete;
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
  if (!lowerSrc.startsWith("http://") && !lowerSrc.startsWith("https://")) {
    return AssetMediaEngine.fetch(host, urlGenerator, src);
  }

  // Remote (http/https) source, now check configuration
  const configuration = host.closest("ef-configuration");
  if (configuration?.mediaEngine === "local") {
    // Only use AssetMediaEngine for remote URLs when explicitly configured
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
      return createMediaEngine(host);
    },
    onComplete: (_value) => {
      handleMediaEngineComplete(host);
    },
  });
};
