import { readdir, readFile } from "node:fs/promises";
import { join, resolve, dirname } from "node:path";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import fm from "front-matter";
import { extractTextFromMDX } from "./extract-text.server";
import type { SearchDocument, SearchIndexMetadata } from "./search.client";
import { computeTFIDFVectors } from "./vector-search.server";

const appDir = resolve(process.cwd(), "services/web/app");
const docsBasePath = join(appDir, "content", "docs");

/**
 * Recursively scans docs directory and builds search index
 * @param includeVectors - Whether to compute TF-IDF vectors (default: true in production, false in development)
 */
export async function buildSearchIndex(
  includeVectors: boolean = process.env.NODE_ENV === "production",
): Promise<{
  documents: SearchDocument[];
  metadata: SearchIndexMetadata | null;
}> {
  const documents: SearchDocument[] = [];
  
  // Recursively process all MDX files
  await processDirectory(docsBasePath, "", documents);
  
  // Compute TF-IDF vectors only if requested
  if (includeVectors) {
    const { vectors, vocabulary, idf } = computeTFIDFVectors(documents);
    
    // Add vectors to documents
    for (let i = 0; i < documents.length; i++) {
      documents[i].vector = vectors[i];
    }
    
    return {
      documents,
      metadata: { vocabulary, idf },
    };
  }
  
  return {
    documents,
    metadata: null,
  };
}

/**
 * Adds vectors to existing documents (for lazy computation)
 */
export async function addVectorsToDocuments(
  documents: SearchDocument[],
): Promise<{
  documents: SearchDocument[];
  metadata: SearchIndexMetadata;
}> {
  const { vectors, vocabulary, idf } = computeTFIDFVectors(documents);
  
  // Add vectors to documents
  for (let i = 0; i < documents.length; i++) {
    documents[i].vector = vectors[i];
  }
  
  return {
    documents,
    metadata: { vocabulary, idf },
  };
}

/**
 * Recursively processes a directory and its subdirectories
 */
async function processDirectory(
  directory: string,
  relativePath: string,
  documents: SearchDocument[],
): Promise<void> {
  const entries = await readdir(directory, { withFileTypes: true });
  
  for (const entry of entries) {
    // Skip non-MDX files and example directories
    if (entry.name.endsWith(".tsx") || entry.name === "examples") {
      continue;
    }
    
    const fullPath = join(directory, entry.name);
    
    if (entry.isDirectory()) {
      // Recursively process subdirectories
      const newRelativePath = relativePath 
        ? join(relativePath, entry.name)
        : entry.name;
      await processDirectory(fullPath, newRelativePath, documents);
    } else if (entry.isFile() && entry.name.endsWith(".mdx")) {
      // Process MDX file
      try {
        const fileContent = await readFile(fullPath, "utf-8");
        const { attributes, body } = fm<any>(fileContent);
        
        // Extract metadata
        const titleAttr = attributes.meta?.find((attr: any) => attr.title);
        const title = titleAttr?.title || entry.name.replace(".mdx", "");
        const descAttr = attributes.meta?.find(
          (attr: any) => attr.name === "description"
        );
        const description = descAttr?.content || "";
        
        // Extract text content
        const { content, headings } = extractTextFromMDX(fileContent);
        
        // Determine slug
        let slug: string;
        if (entry.name === "index.mdx") {
          // For index files, use the directory path
          const dirSlug = relativePath
            .replace(/(\/?\d+-)/g, "/")
            .replace(/^\//, "");
          slug = dirSlug ? `/docs/${dirSlug}` : "/docs";
        } else {
          // For regular files, construct slug from path
          const filePath = relativePath
            ? join(relativePath, entry.name.replace(".mdx", ""))
            : entry.name.replace(".mdx", "");
          const fileSlug = filePath
            .replace(/(\/?\d+-)/g, "/")
            .replace(/^\//, "");
          slug = `/docs/${fileSlug}`;
        }
        
        // Determine category from first part of slug
        const category = slug.split("/")[2] || undefined;
        
        // Create document
        const doc: SearchDocument = {
          id: slug,
          title,
          description,
          slug,
          content,
          headings,
          category,
        };
        
        documents.push(doc);
      } catch (error) {
        console.warn(`Failed to process ${fullPath}:`, error);
        // Continue processing other files
      }
    }
  }
}

/**
 * Writes search index to JSON file
 */
export async function writeSearchIndex(
  outputPath: string,
  documents: SearchDocument[],
  metadata: SearchIndexMetadata | null,
): Promise<void> {
  const { writeFile } = await import("node:fs/promises");
  const { mkdir } = await import("node:fs/promises");
  const { dirname } = await import("node:path");
  
  // Ensure directory exists
  await mkdir(dirname(outputPath), { recursive: true });
  
  // Write index with metadata
  const indexData = {
    documents,
    metadata,
  };
  
  await writeFile(
    outputPath,
    JSON.stringify(indexData, null, 2),
    "utf-8"
  );
}

/**
 * Synchronous version for use in API routes
 */
export function writeSearchIndexSync(
  outputPath: string,
  documents: SearchDocument[],
  metadata: SearchIndexMetadata | null,
): void {
  // Ensure directory exists
  mkdirSync(dirname(outputPath), { recursive: true });
  
  // Write index with metadata
  const indexData = {
    documents,
    metadata,
  };
  
  writeFileSync(
    outputPath,
    JSON.stringify(indexData, null, 2),
    "utf-8"
  );
}

