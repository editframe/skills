import { createHash } from "node:crypto";

export interface ParsedMdx {
  headings: unknown[];
  frontmatter: Record<string, unknown>;
  readTime: { text: string; minutes: number; time: number; words: number };
  code: string;
  body: string;
}

const cache = new Map<string, ParsedMdx>();

export function contentHash(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

export function getCached(hash: string): ParsedMdx | undefined {
  return cache.get(hash);
}

export function setCached(hash: string, value: ParsedMdx): void {
  cache.set(hash, value);
}
