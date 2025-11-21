import type { Plugin } from "vite";
import { resolve } from "node:path";

/**
 * Vite plugin that generates search index after build completes
 */
export function buildSearchIndexPlugin(): Plugin {
  return {
    name: "build-search-index",
    enforce: "post",
    async writeBundle() {
      try {
        // Dynamically import to avoid loading in dev mode
        const { buildSearchIndex, writeSearchIndex } = await import(
          "../../services/web/app/utils/search-index.server"
        );

        // Build the search index
        const documents = await buildSearchIndex();

        // Determine output path (client build directory)
        const outputPath = resolve(
          process.cwd(),
          "services/web/build/client/search-index.json"
        );

        // Write the index
        await writeSearchIndex(outputPath, documents);

        console.log(
          `✓ Generated search index with ${documents.length} documents`
        );
      } catch (error) {
        console.error("Failed to generate search index:", error);
        // Don't fail the build if search index generation fails
      }
    },
  };
}

