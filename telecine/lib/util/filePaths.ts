import { createHash } from "node:crypto";

interface PathDescriptor {
  org_id: string;
  id: string;
}

// This is intentionally private to this file. This is the only
// function that allows specifying a name, and we do not want uncontrolled names
// to be passed in from calling code.
const filePath = ({ org_id, id, name }: PathDescriptor & { name: string }) =>
  `video2/${org_id}/${id}/${name}`;

export const dataFilePath = ({ org_id, id }: PathDescriptor) =>
  filePath({ org_id, id, name: "data" });

export const captionsFilePath = ({ org_id, id }: PathDescriptor) =>
  filePath({ org_id, id, name: "captions.json" });

export const isobmffIndexFilePath = ({ org_id, id }: PathDescriptor) =>
  filePath({ org_id, id, name: "tracks.json" });

export const isobmffTrackFilePath = ({
  org_id,
  id,
  track_id,
}: PathDescriptor & { track_id: number }) =>
  filePath({ org_id, id, name: `track-${track_id}.mp4` });

export const imageFilePath = (pathDescriptor: PathDescriptor) =>
  dataFilePath(pathDescriptor);

export const renderFilePath = ({
  org_id,
  id,
}: Pick<PathDescriptor, "org_id" | "id">) =>
  `video2/renders/${org_id}/${id}/bundle.tar.gz`;

export const renderStillFilePath = ({
  org_id,
  id,
  fileType,
}: Pick<PathDescriptor, "org_id" | "id"> & {
  fileType: "mp4" | "jpeg" | "png" | "webp";
}) => {
  return `video2/renders/${org_id}/${id}/output.${fileType}`;
};

export const renderAssetsMetadataFilePath = ({
  org_id,
  id,
}: Pick<PathDescriptor, "org_id" | "id">) =>
  `video2/renders/${org_id}/${id}/assets.json`;

export const renderFragmentFilePath = ({
  org_id,
  id,
  segmentId,
  fileType,
}: Pick<PathDescriptor, "org_id" | "id"> & {
  segmentId: "init" | number | `${number}`;
  fileType?: "standalone" | "fragment";
}) => {
  switch (fileType) {
    case "standalone":
      return `video2/renders/${org_id}/${id}/segment/${segmentId}.mp4`;
    default:
      return `video2/renders/${org_id}/${id}/segment/${segmentId}.m4s`;
  }
};

export const transcribeFragmentFilePath = ({
  org_id,
  id,
  segmentId,
}: Pick<PathDescriptor, "org_id" | "id"> & {
  segmentId: number;
}) => `video2/${org_id}/${id}/transcribe/${segmentId}.json`;

export const renderFinalFilePath = ({
  org_id,
  id,
}: Pick<PathDescriptor, "org_id" | "id">) =>
  `video2/renders/${org_id}/${id}/output.mp4`;

export const renderFragmentComposePrefixPath = ({
  org_id,
  id,
}: Pick<PathDescriptor, "org_id" | "id">) =>
  `video2/renders/${org_id}/${id}/segment/compose/`;

/**
 * Generate cache file path for video metadata (synthetic MP4 files).
 * Uses deterministic hashing to create filesystem-safe paths.
 * Format: cache/{hashedUrl}/metadata/synthetic.mp4
 */
export const cacheMetadataFilePath = ({ url }: { url: string }) => {
  // Normalize URL for consistent cache keys
  const normalizedUrl = normalizeUrl(url);

  // Create hash of the URL for directory structure
  const urlHash = createHash("sha256")
    .update(normalizedUrl)
    .digest("hex")
    .substring(0, 16); // Use first 16 chars for shorter paths

  return `cache/${urlHash}/metadata/synthetic.mp4`;
};

/**
 * Generate cache file path for transcoded video segments.
 * Uses deterministic hashing to create filesystem-safe paths.
 * Format: cache/{hashedUrl}/transcoded/{preset}/{hashedStartTime}-{startTimeMs}.{extension}
 */
export const cacheTranscodedSegmentFilePath = ({
  url,
  preset,
  startTimeMs,
  extension = "mp4",
}: {
  url: string;
  preset: string;
  startTimeMs: number;
  extension?: "mp4" | "m4s";
}) => {
  // Normalize URL for consistent cache keys
  const normalizedUrl = normalizeUrl(url);

  // Create hash of the URL for directory structure
  const urlHash = createHash("sha256")
    .update(normalizedUrl)
    .digest("hex")
    .substring(0, 16); // Use first 16 chars for shorter paths

  // Hash the start time to avoid sequential file names in cloud storage
  const startTimeHash = createHash("sha256")
    .update(startTimeMs.toString())
    .digest("hex")
    .substring(0, 8); // Use first 8 chars for start time hash

  return `cache/${urlHash}/transcoded/${preset}/${startTimeHash}-${startTimeMs}.${extension}`;
};

/**
 * Generate cache file path for init segments.
 * Uses deterministic hashing to create filesystem-safe paths.
 * Format: cache/{hashedUrl}/transcoded/{preset}/init.{extension}
 */
export const cacheTranscodedInitSegmentFilePath = ({
  url,
  preset,
  extension = "mp4",
}: {
  url: string;
  preset: string;
  extension?: "mp4" | "m4s";
}) => {
  // Normalize URL for consistent cache keys
  const normalizedUrl = normalizeUrl(url);

  // Create hash of the URL for directory structure
  const urlHash = createHash("sha256")
    .update(normalizedUrl)
    .digest("hex")
    .substring(0, 16); // Use first 16 chars for shorter paths

  return `cache/${urlHash}/transcoded/${preset}/init.${extension}`;
};

/**
 * Check if a given path is a cache path.
 */
export const isCachePath = (path: string): boolean => {
  return (
    path.startsWith("cache/") &&
    (path.includes("/transcoded/") || path.includes("/metadata/"))
  );
};

/**
 * Get the base cache directory for a given URL.
 * Format: cache/{hashedUrl}
 */
export const getCacheBaseDirectory = (url: string): string => {
  const normalizedUrl = normalizeUrl(url);
  const urlHash = createHash("sha256")
    .update(normalizedUrl)
    .digest("hex")
    .substring(0, 16);
  return `cache/${urlHash}`;
};

/**
 * Extract cache directory path from cache file path.
 * Works with both metadata and transcoded cache paths.
 */
export const getCacheDirectory = (cacheFilePath: string): string => {
  const parts = cacheFilePath.split("/");
  return parts.slice(0, -1).join("/");
};

/**
 * Normalize URL for consistent cache key generation.
 * Removes tracking parameters and normalizes case.
 */
function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);

    // Remove common tracking/session parameters that don't affect video content
    const excludeParams = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "session",
      "token",
    ];
    excludeParams.forEach((param) => urlObj.searchParams.delete(param));

    // Sort search params for consistency
    urlObj.searchParams.sort();

    // Normalize hostname to lowercase
    urlObj.hostname = urlObj.hostname.toLowerCase();

    return urlObj.toString();
  } catch (error) {
    // If URL parsing fails, return original URL (will be validated upstream)
    return url;
  }
}
