import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import type { Route } from "./+types/search";
import type {
  SearchDocument,
  SearchIndexMetadata,
} from "~/utils/search.client";

const PROD_BUILD_PATH = "/app/services/web/build/client/search-index.json";
const DEV_BUILD_PATH = resolve(
  process.cwd(),
  "services/web/build/client/search-index.json"
);

// Cache for computed vectors in development (lazy computation)
let cachedIndexWithVectors: {
  documents: SearchDocument[];
  metadata: SearchIndexMetadata;
} | null = null;

/**
 * Loads search index from build assets, generating it if it doesn't exist (dev mode)
 * In development, vectors are computed lazily on first request to avoid build-time overhead
 */
async function loadSearchIndex(): Promise<
  | SearchDocument[]
  | { documents: SearchDocument[]; metadata: SearchIndexMetadata | null }
> {
  // Try production path first, then dev path
  const indexPath = existsSync(PROD_BUILD_PATH)
    ? PROD_BUILD_PATH
    : existsSync(DEV_BUILD_PATH)
    ? DEV_BUILD_PATH
    : null;

  if (indexPath && existsSync(indexPath)) {
    try {
      const indexContent = readFileSync(indexPath, "utf-8");
      const parsed = JSON.parse(indexContent);
      
      // Handle both old format (array) and new format (object)
      if (Array.isArray(parsed)) {
        return parsed as SearchDocument[];
      }
      
      const indexData = parsed as {
        documents: SearchDocument[];
        metadata: SearchIndexMetadata | null;
      };
      
      // In development, if vectors are missing, compute them lazily
      if (
        process.env.NODE_ENV !== "production" &&
        (!indexData.metadata || !indexData.documents.some((d) => d.vector))
      ) {
        // Use cached version if available
        if (cachedIndexWithVectors) {
          return cachedIndexWithVectors;
        }
        
        // Compute vectors on-demand
        const { addVectorsToDocuments } = await import(
          "~/utils/search-index.server"
        );
        const { documents, metadata } = await addVectorsToDocuments(
          indexData.documents,
        );
        
        // Cache the result
        cachedIndexWithVectors = { documents, metadata };
        
        // Optionally update the file for future requests (non-blocking)
        const { writeSearchIndexSync } = await import(
          "~/utils/search-index.server"
        );
        try {
          writeSearchIndexSync(DEV_BUILD_PATH, documents, metadata);
        } catch (error) {
          // Non-critical, just log
          console.warn("Failed to cache computed vectors:", error);
        }
        
        return { documents, metadata };
      }
      
      return indexData;
    } catch (error) {
      console.error("Failed to load search index:", error);
    }
  }

  // In development, generate the index if it doesn't exist (without vectors)
  if (process.env.NODE_ENV !== "production") {
    try {
      const { buildSearchIndex, writeSearchIndexSync } = await import(
        "~/utils/search-index.server"
      );
      // Build without vectors for fast development iteration
      const { documents, metadata } = await buildSearchIndex(false);
      
      // Write to dev path for future requests
      const devPath = DEV_BUILD_PATH;
      writeSearchIndexSync(devPath, documents, metadata);
      
      console.log(`✓ Generated search index with ${documents.length} documents`);
      
      // Compute vectors lazily on first request
      if (cachedIndexWithVectors) {
        return cachedIndexWithVectors;
      }
      
      const { addVectorsToDocuments } = await import(
        "~/utils/search-index.server"
      );
      const { documents: docsWithVectors, metadata: vectorsMetadata } =
        await addVectorsToDocuments(documents);
      
      cachedIndexWithVectors = {
        documents: docsWithVectors,
        metadata: vectorsMetadata,
      };
      
      return { documents: docsWithVectors, metadata: vectorsMetadata };
    } catch (error) {
      console.error("Failed to generate search index:", error);
      return [];
    }
  }

  return [];
}

export const loader = async ({ request }: Route.LoaderArgs) => {
  const index = await loadSearchIndex();

  // Handle backward compatibility: if old format (array), wrap it
  const responseData = Array.isArray(index)
    ? { documents: index, metadata: null }
    : index;

  return new Response(JSON.stringify(responseData), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      // Use no-cache to ensure fresh data, especially important during development
      // and when docs are updated. Correctness is more important than speed.
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
    },
  });
};

