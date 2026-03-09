import MiniSearch from "minisearch";
import {
  cosineSimilarity,
  computeQueryVector as computeQueryVectorClient,
} from "./vector-search.client";

export interface SearchDocument {
  id: string; // Unique identifier (slug-based)
  title: string; // Page title from frontmatter
  description: string; // Page description from frontmatter
  slug: string; // URL path (e.g., "/docs/elements/video")
  content: string; // Full text content (plain text, no markdown)
  headings: string[]; // Array of heading texts for context
  category?: string; // Section category (e.g., "elements", "getting-started")
  vector?: number[]; // TF-IDF vector for semantic search (optional)
}

export interface SearchIndexMetadata {
  vocabulary: string[];
  idf: Record<string, number>;
}

export interface SearchResult extends SearchDocument {
  score: number;
  match?: {
    [key: string]: string[];
  };
}

let searchIndex: MiniSearch<SearchDocument> | null = null;
let documents: SearchDocument[] | null = null;
let searchMetadata: SearchIndexMetadata | null = null;

/**
 * Initializes the search index by loading documents from the API
 */
export async function initializeSearch(): Promise<void> {
  if (searchIndex) {
    return; // Already initialized
  }

  try {
    const response = await fetch("/api/v1/docs/search");
    if (!response.ok) {
      throw new Error(`Failed to load search index: ${response.statusText}`);
    }

    const indexData = (await response.json()) as
      | SearchDocument[]
      | { documents: SearchDocument[]; metadata: SearchIndexMetadata | null };

    // Handle both old format (array) and new format (object with metadata)
    if (Array.isArray(indexData)) {
      documents = indexData;
      searchMetadata = null;
    } else {
      documents = indexData.documents;
      searchMetadata = indexData.metadata;
    }

    // Create MiniSearch instance
    searchIndex = new MiniSearch<SearchDocument>({
      fields: ["title", "description", "content", "headings"],
      storeFields: [
        "id",
        "title",
        "description",
        "slug",
        "category",
        "headings",
      ],
      searchOptions: {
        boost: { title: 3, description: 2, headings: 1.5, content: 1 },
        fuzzy: 0.2, // Typo tolerance (0-1)
        prefix: true, // Prefix matching
      },
    });

    // Add all documents to the index
    searchIndex.addAll(documents);
  } catch (error) {
    console.error("Failed to initialize search:", error);
    throw error;
  }
}

/**
 * Performs a hybrid search (keyword + semantic) and returns ranked results
 */
export function search(
  query: string,
  options?: { useVectorSearch?: boolean; vectorWeight?: number },
): SearchResult[] {
  if (!searchIndex) {
    throw new Error("Search not initialized. Call initializeSearch() first.");
  }

  if (!query.trim()) {
    return [];
  }

  const useVectorSearch = options?.useVectorSearch ?? true;
  const vectorWeight = options?.vectorWeight ?? 0.4; // 40% vector, 60% keyword

  // Perform keyword search with minisearch
  const keywordResults = searchIndex.search(query, {
    boost: { title: 3, description: 2, headings: 1.5, content: 1 },
    fuzzy: 0.2,
    prefix: true,
  });

  // Create keyword score map
  const keywordScores = new Map<string, number>();
  const maxKeywordScore = keywordResults[0]?.score || 1;
  for (const result of keywordResults) {
    // Normalize keyword scores to 0-1 range
    keywordScores.set(result.id, result.score / maxKeywordScore);
  }

  // Perform vector search if metadata is available
  let vectorScores = new Map<string, number>();
  if (
    useVectorSearch &&
    searchMetadata &&
    documents &&
    documents.some((d) => d.vector)
  ) {
    const queryVector = computeQueryVectorClient(
      query,
      searchMetadata.vocabulary,
      searchMetadata.idf,
    );

    // Compute cosine similarity for all documents
    for (const doc of documents) {
      if (doc.vector) {
        const similarity = cosineSimilarity(queryVector, doc.vector);
        vectorScores.set(doc.id, Math.max(0, similarity)); // Ensure non-negative
      }
    }

    // Normalize vector scores to 0-1 range
    const maxVectorScore = Math.max(...Array.from(vectorScores.values()), 1);
    if (maxVectorScore > 0) {
      for (const [id, score] of vectorScores.entries()) {
        vectorScores.set(id, score / maxVectorScore);
      }
    }
  }

  // Combine scores: hybrid approach
  const combinedScores = new Map<string, number>();
  const allDocIds = new Set([...keywordScores.keys(), ...vectorScores.keys()]);

  for (const docId of allDocIds) {
    const keywordScore = keywordScores.get(docId) || 0;
    const vectorScore = vectorScores.get(docId) || 0;

    // Weighted combination
    const combinedScore =
      keywordScore * (1 - vectorWeight) + vectorScore * vectorWeight;
    combinedScores.set(docId, combinedScore);
  }

  // Sort by combined score
  const sortedResults = Array.from(combinedScores.entries())
    .map(([id, score]) => {
      const doc = documents?.find((d) => d.id === id);
      const keywordResult = keywordResults.find((r) => r.id === id);
      if (!doc) {
        return null;
      }

      return {
        ...doc,
        score,
        match: keywordResult?.match,
      } as SearchResult;
    })
    .filter((r): r is SearchResult => r !== null)
    .sort((a, b) => b.score - a.score);

  // Limit to top 20 results
  return sortedResults.slice(0, 20);
}

/**
 * Checks if search is initialized
 */
export function isSearchInitialized(): boolean {
  return searchIndex !== null;
}
