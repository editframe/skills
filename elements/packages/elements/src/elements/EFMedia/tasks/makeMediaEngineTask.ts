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
): Promise<MediaEngine | undefined> => {
  let mediaEngine;
  try {
    mediaEngine = await host.mediaEngineTask.taskComplete;
  } catch (error) {
    // If aborted, re-throw to propagate cancellation
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    // If the error is "No valid media source", return undefined instead of throwing
    // This allows callers to handle missing media gracefully
    if (error instanceof Error && error.message === "No valid media source") {
      return undefined;
    }
    // For other errors, re-throw
    throw error;
  }
  signal.throwIfAborted();
  // Return undefined if no media engine (no valid source)
  // Callers should check for undefined and exit gracefully
  return mediaEngine || undefined;
};

/**
 * Core logic for creating a MediaEngine with explicit dependencies.
 * Pure function that requires all dependencies to be provided.
 * 
 * @param host - The EFMedia element host
 * @param signal - AbortSignal to cancel in-flight requests when element is disconnected
 */
export const createMediaEngine = (host: EFMedia, signal?: AbortSignal): Promise<MediaEngine> => {
  const { src, assetId, urlGenerator, apiHost, requiredTracks } = host;

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
      requiredTracks,
      signal,
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
    return JitMediaEngine.fetch(host, urlGenerator, url, signal);
  }
  
  // "local" mode: Force AssetMediaEngine for all sources
  if (configuration?.mediaEngine === "local") {
    return AssetMediaEngine.fetch(host, urlGenerator, src, requiredTracks, signal);
  }
  
  // "cloud" mode (default): AssetMediaEngine for local paths, JitMediaEngine for remote URLs
  if (!isRemoteUrl) {
    return AssetMediaEngine.fetch(host, urlGenerator, src, requiredTracks, signal);
  }

  // Default: Use JitMediaEngine for remote URLs (transcoding service)
  const url = urlGenerator.generateManifestUrl(src);
  return JitMediaEngine.fetch(host, urlGenerator, url, signal);
};

/**
 * Handle completion of media engine task - triggers necessary updates.
 * Extracted for testability.
 */
export const handleMediaEngineComplete = (host: EFMedia): void => {
  // Update self synchronously - this is fine because we're updating the element
  // that just completed its task, not a parent
  host.requestUpdate("intrinsicDurationMs");
  host.requestUpdate("ownCurrentTimeMs");
  
  // Defer updates to parent/root timegroup to avoid Lit warning about scheduling
  // updates after update completed (change-in-update). Task onComplete can be
  // called during an update cycle, and directly calling requestUpdate on parent
  // elements causes the warning.
  if (host.rootTimegroup) {
    queueMicrotask(() => {
      host.rootTimegroup?.requestUpdate("ownCurrentTimeMs");
      host.rootTimegroup?.requestUpdate("durationMs");
    });
  }
};

type MediaEngineTask = Task<readonly [string, string | null], MediaEngine>;

export const makeMediaEngineTask = (host: EFMedia): MediaEngineTask => {
  // Capture task reference for use in onError
  let task: MediaEngineTask;
  
  task = new Task(host, {
    autoRun: EF_INTERACTIVE,
    args: () => [host.src, host.assetId] as const,
    task: async ([_src, _assetId], { signal }) => {
      // Check abort before starting work
      signal?.throwIfAborted();
      
      // Check if we have a valid source before attempting to create media engine
      // This avoids unnecessary errors when src is empty/null/undefined
      const { src, assetId } = host;
      
      // If we have a valid assetId, proceed
      if (assetId !== null && assetId !== undefined && assetId.trim() !== "") {
        return createMediaEngine(host, signal);
      }
      
      // If we don't have a valid src, return undefined instead of throwing
      // This allows dependent tasks to check for undefined and exit gracefully
      // without logging errors for expected conditions
      if (!src || typeof src !== "string" || src.trim() === "") {
        return undefined as unknown as MediaEngine;
      }
      
      // Check abort before expensive operation
      signal?.throwIfAborted();
      
      return createMediaEngine(host, signal);
    },
    onError: (error) => {
      // CRITICAL: Attach .catch() handler to taskComplete BEFORE the promise is rejected.
      // onError is called synchronously before completeDeferred.reject() in Lit Task,
      // so this handler will be attached in time to prevent unhandled rejection.
      // Without this, the rejection from hostUpdate() -> _performTask() (which isn't awaited)
      // becomes an unhandled promise rejection.
      task.taskComplete.catch(() => {});
      
      // Don't log AbortError - these are intentional cancellations when element is disconnected
      const isAbortError = 
        error instanceof DOMException && error.name === "AbortError" ||
        error instanceof Error && (
          error.name === "AbortError" ||
          error.message.includes("signal is aborted") ||
          error.message.includes("The user aborted a request")
        );
      
      // Don't log errors when there's no valid media source or file not found - these are expected
      if (isAbortError || (error instanceof Error && (
        error.message === "No valid media source" ||
        error.message.includes("File not found") ||
        error.message.includes("404") ||
        error.message.includes("Failed to fetch")
      ))) {
        return;
      }
      
      // Log other unexpected errors
      console.error("mediaEngineTask error", error);
    },
    onComplete: (value) => {
      // Only trigger updates if we actually got a media engine
      if (value) {
        handleMediaEngineComplete(host);
      }
    },
  });
  
  // CRITICAL: Attach .catch() handler IMMEDIATELY to prevent unhandled rejections.
  // This must be done synchronously after task creation, before any updates can trigger run().
  // When hostUpdate() triggers _performTask() -> run(), the rejection needs to already have a handler.
  task.taskComplete.catch(() => {});
  
  return task;
};
