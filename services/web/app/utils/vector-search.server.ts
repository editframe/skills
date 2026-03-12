import type { SearchDocument } from "./search.client";

/**
 * Simple tokenizer - splits text into words, lowercases, removes punctuation
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2); // Filter out very short words
}

/**
 * Computes TF-IDF vectors for documents
 * This is a simple, zero-dependency approach to semantic search
 */
export function computeTFIDFVectors(documents: SearchDocument[]): {
  vectors: number[][];
  vocabulary: string[];
  idf: Record<string, number>;
} {
  // Build vocabulary from all documents
  const vocabularySet = new Set<string>();
  const documentTokens: string[][] = [];

  for (const doc of documents) {
    // Combine all searchable text
    const text = [doc.title, doc.description, doc.content, ...doc.headings]
      .filter(Boolean)
      .join(" ");

    const tokens = tokenize(text);
    documentTokens.push(tokens);
    tokens.forEach((token) => vocabularySet.add(token));
  }

  const vocabulary = Array.from(vocabularySet).sort();
  const vocabularyIndex = new Map(vocabulary.map((word, i) => [word, i]));
  const numDocs = documents.length;

  // Compute IDF (Inverse Document Frequency)
  const idf: Record<string, number> = {};
  for (const word of vocabulary) {
    const docsContainingWord = documentTokens.filter((tokens) =>
      tokens.includes(word),
    ).length;
    // IDF = log((total docs + 1) / (docs containing word + 1))
    idf[word] = Math.log((numDocs + 1) / (docsContainingWord + 1));
  }

  // Compute TF-IDF vectors for each document
  const vectors: number[][] = [];

  for (let i = 0; i < documents.length; i++) {
    const tokens = documentTokens[i];
    const vector = new Array(vocabulary.length).fill(0);

    // Count term frequencies
    const termFreq: Record<string, number> = {};
    for (const token of tokens) {
      termFreq[token] = (termFreq[token] || 0) + 1;
    }

    // Compute TF-IDF
    const maxFreq = Math.max(...Object.values(termFreq), 1);
    for (const [word, freq] of Object.entries(termFreq)) {
      const wordIndex = vocabularyIndex.get(word);
      if (wordIndex !== undefined) {
        // TF = normalized frequency, IDF from precomputed map
        const tf = freq / maxFreq;
        vector[wordIndex] = tf * idf[word];
      }
    }

    // Normalize vector (L2 norm)
    const magnitude = Math.sqrt(
      vector.reduce((sum, val) => sum + val * val, 0),
    );
    if (magnitude > 0) {
      for (let j = 0; j < vector.length; j++) {
        vector[j] = vector[j] / magnitude;
      }
    }

    vectors.push(vector);
  }

  return { vectors, vocabulary, idf };
}

/**
 * Computes TF-IDF vector for a query string
 */
export function computeQueryVector(
  query: string,
  vocabulary: string[],
  idf: Record<string, number>,
): number[] {
  const tokens = tokenize(query);
  const vocabularyIndex = new Map(vocabulary.map((word, i) => [word, i]));
  const vector = new Array(vocabulary.length).fill(0);

  // Count term frequencies in query
  const termFreq: Record<string, number> = {};
  for (const token of tokens) {
    termFreq[token] = (termFreq[token] || 0) + 1;
  }

  // Compute TF-IDF
  const maxFreq = Math.max(...Object.values(termFreq), 1);
  for (const [word, freq] of Object.entries(termFreq)) {
    const wordIndex = vocabularyIndex.get(word);
    if (wordIndex !== undefined && idf[word]) {
      const tf = freq / maxFreq;
      vector[wordIndex] = tf * idf[word];
    }
  }

  // Normalize vector (L2 norm)
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    for (let j = 0; j < vector.length; j++) {
      vector[j] = vector[j] / magnitude;
    }
  }

  return vector;
}
