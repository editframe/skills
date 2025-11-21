import MiniSearch from "minisearch";

export interface SearchDocument {
  id: string;           // Unique identifier (slug-based)
  title: string;        // Page title from frontmatter
  description: string;  // Page description from frontmatter
  slug: string;         // URL path (e.g., "/docs/elements/video")
  content: string;      // Full text content (plain text, no markdown)
  headings: string[];   // Array of heading texts for context
  category?: string;    // Section category (e.g., "elements", "getting-started")
}

export interface SearchResult extends SearchDocument {
  score: number;
  match?: {
    [key: string]: string[];
  };
}

let searchIndex: MiniSearch<SearchDocument> | null = null;
let documents: SearchDocument[] | null = null;

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

    documents = (await response.json()) as SearchDocument[];

    // Create MiniSearch instance
    searchIndex = new MiniSearch<SearchDocument>({
      fields: ["title", "description", "content", "headings"],
      storeFields: ["id", "title", "description", "slug", "category", "headings"],
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
 * Performs a search query and returns ranked results
 */
export function search(query: string): SearchResult[] {
  if (!searchIndex) {
    throw new Error("Search not initialized. Call initializeSearch() first.");
  }

  if (!query.trim()) {
    return [];
  }

  // Perform search with limit
  const results = searchIndex.search(query, {
    boost: { title: 3, description: 2, headings: 1.5, content: 1 },
    fuzzy: 0.2,
    prefix: true,
  });

  // Limit to top 20 results
  const limitedResults = results.slice(0, 20);

  // Map to SearchResult format with full document data
  return limitedResults.map((result) => {
    const doc = documents?.find((d) => d.id === result.id);
    if (!doc) {
      throw new Error(`Document ${result.id} not found`);
    }

    return {
      ...doc,
      score: result.score,
      match: result.match,
    } as SearchResult;
  });
}

/**
 * Checks if search is initialized
 */
export function isSearchInitialized(): boolean {
  return searchIndex !== null;
}

