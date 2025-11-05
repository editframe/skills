import { logger } from "@/logging";
import { storageProvider } from "@/util/storageProvider.server";
import { isobmffIndexFilePath } from "@/util/filePaths";
import { executeSpan } from "@/tracing";

// Simplified bundle containing only the data actually used during rendering
export interface AssetsMetadataBundle {
  // Maps asset-id to complete fragment index JSON from /api/v1/isobmff_files/{id}/indexFile
  // This contains all the duration, codec, and seeking data needed for rendering
  fragmentIndexes: Record<string, Record<number, any>>;
}

/**
 * Extract media asset IDs from getRenderInfo assets array
 * Only extracts video/audio assets that need fragment indexes
 * Assets are in format "asset-id=uuid" or "src=url"
 */
function extractMediaAssetIds(assetSrcs: string[]): string[] {
  return assetSrcs
    .filter(src => src.startsWith('asset-id='))
    .map(src => src.replace('asset-id=', ''));
}

/**
 * Fetch fragment indexes for ISOBMFF files
 */
async function fetchFragmentIndexes(assetIds: string[], orgId: string): Promise<Record<string, Record<number, any>>> {
  return executeSpan(
    "fetchFragmentIndexes",
    async () => {
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
          const fragmentIndex = JSON.parse(indexBuffer.toString('utf-8'));
          fragmentIndexes[assetId] = fragmentIndex;

          logger.debug({ assetId, trackCount: Object.keys(fragmentIndex).length }, "Loaded fragment index");
        } catch (error) {
          logger.warn({ assetId, error }, "Failed to load fragment index");
          // Continue with other assets if one fails
        }
      }

      logger.debug({ indexCount: Object.keys(fragmentIndexes).length }, "Fetched fragment indexes");
      return fragmentIndexes;
    });
}

/**
 * Create asset metadata bundle containing only fragment indexes for video/audio assets
 * Fragment indexes contain all the duration, codec, and seeking data needed for rendering
 */
export async function createAssetsMetadataBundle(
  assets: { efMediaSrcs: string[]; efImageSrcs: string[] },
  orgId: string
): Promise<AssetsMetadataBundle> {
  return executeSpan(
    "createAssetsMetadataBundle",
    async () => {
      logger.debug({ assets, orgId }, "Creating fragment index bundle for media assets");

      // Only extract media asset IDs - images don't need fragment indexes
      const mediaAssetIds = extractMediaAssetIds(assets.efMediaSrcs);

      logger.debug({ mediaAssetIds }, "Extracted media asset IDs for fragment indexing");

      // Fetch only fragment indexes - these contain all rendering-critical data
      const fragmentIndexes = await fetchFragmentIndexes(mediaAssetIds, orgId);

      const bundle = {
        fragmentIndexes
      };

      logger.debug({
        fragmentIndexCount: Object.keys(fragmentIndexes).length
      }, "Created fragment index bundle");

      return bundle;
    });
}
