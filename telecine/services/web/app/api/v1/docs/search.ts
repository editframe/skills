import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import type { Route } from "./+types/search";
import type { SearchDocument } from "~/utils/search.client";

const PROD_BUILD_PATH = "/app/services/web/build/client/search-index.json";
const DEV_BUILD_PATH = resolve(
  process.cwd(),
  "services/web/build/client/search-index.json"
);

/**
 * Loads search index from build assets, generating it if it doesn't exist (dev mode)
 */
async function loadSearchIndex(): Promise<SearchDocument[]> {
  // Try production path first, then dev path
  const indexPath = existsSync(PROD_BUILD_PATH)
    ? PROD_BUILD_PATH
    : existsSync(DEV_BUILD_PATH)
    ? DEV_BUILD_PATH
    : null;

  if (indexPath && existsSync(indexPath)) {
    try {
      const indexContent = readFileSync(indexPath, "utf-8");
      return JSON.parse(indexContent) as SearchDocument[];
    } catch (error) {
      console.error("Failed to load search index:", error);
    }
  }

  // In development, generate the index if it doesn't exist
  if (process.env.NODE_ENV !== "production") {
    try {
      const { buildSearchIndex, writeSearchIndexSync } = await import(
        "~/utils/search-index.server"
      );
      const documents = await buildSearchIndex();
      
      // Write to dev path for future requests
      const devPath = DEV_BUILD_PATH;
      writeSearchIndexSync(devPath, documents);
      
      console.log(`✓ Generated search index with ${documents.length} documents`);
      return documents;
    } catch (error) {
      console.error("Failed to generate search index:", error);
      return [];
    }
  }

  return [];
}

export const loader = async ({ request }: Route.LoaderArgs) => {
  const index = await loadSearchIndex();

  return new Response(JSON.stringify(index), {
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

