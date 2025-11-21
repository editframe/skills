/**
 * Computes cosine similarity between two vectors
 * Pure JavaScript, zero dependencies
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have the same length");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) {
    return 0;
  }

  return dotProduct / denominator;
}

/**
 * Computes TF-IDF vector for a query string (client-side)
 */
export function computeQueryVector(
  query: string,
  vocabulary: string[],
  idf: Record<string, number>,
): number[] {
  // Simple tokenizer
  const tokens = query
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2);

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
  const magnitude = Math.sqrt(
    vector.reduce((sum, val) => sum + val * val, 0),
  );
  if (magnitude > 0) {
    for (let j = 0; j < vector.length; j++) {
      vector[j] = vector[j] / magnitude;
    }
  }

  return vector;
}

