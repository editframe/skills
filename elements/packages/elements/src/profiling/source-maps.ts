/**
 * Source map resolution for profiling
 * Consolidated from profile-playback.ts implementation
 */

import type { ResolvedLocation } from "./types.js";

/**
 * Simple source map resolution for Vite dev server
 * This is a basic implementation - for full source map support,
 * use SourceMapResolver class with @jridgewell/trace-mapping
 */
export function resolveSourceLocation(
  url: string,
  line: number,
  column: number
): ResolvedLocation | null {
  // Check if this is a Vite chunk file with source map
  if (url.includes("chunk-") && url.includes("?v=")) {
    // Vite includes source maps inline or as separate files
    // The browser should have already resolved these, but if not, we can try to extract from stack traces
    // For now, we'll just clean up the URL to make it more readable
    const cleanUrl = url.replace(/\?v=[a-f0-9]+/, "").replace(/^.*\//, "");
    return {
      source: cleanUrl,
      file: cleanUrl,
      line,
      column,
      name: null,
    };
  }

  // For regular source files, return as-is
  const file = url.split("/").pop()?.split("?")[0] || url || "(native)";
  return {
    source: url,
    file,
    line,
    column,
    name: null,
  };
}

/**
 * Cache for fetched text (scripts, source maps)
 */
const fetchCache = new Map<string, Promise<string | null>>();

/**
 * Fetch text content with caching
 */
async function fetchText(url: string): Promise<string | null> {
  if (fetchCache.has(url)) {
    return fetchCache.get(url)!;
  }
  
  const promise = (async () => {
    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      return await response.text();
    } catch {
      return null;
    }
  })();
  
  fetchCache.set(url, promise);
  return promise;
}

/**
 * Advanced source map resolver using @jridgewell/trace-mapping
 * This is exported for use in CLI tools that need full source map support
 * 
 * Example usage:
 * ```ts
 * import { TraceMap, originalPositionFor } from "@jridgewell/trace-mapping";
 * 
 * const resolver = new SourceMapResolver(baseUrl);
 * const resolved = await resolver.resolve(scriptUrl, line, column);
 * ```
 */
export class SourceMapResolver {
  #traceMaps = new Map<string, any>();
  #baseUrl: string;

  constructor(baseUrl: string) {
    this.#baseUrl = baseUrl;
  }

  async getTraceMap(scriptUrl: string): Promise<any | null> {
    if (this.#traceMaps.has(scriptUrl)) {
      return this.#traceMaps.get(scriptUrl)!;
    }

    const scriptContent = await fetchText(scriptUrl);
    if (!scriptContent) {
      this.#traceMaps.set(scriptUrl, null);
      return null;
    }

    const match = scriptContent.match(/\/\/[#@]\s*sourceMappingURL=([^\s]+)/);
    if (!match) {
      this.#traceMaps.set(scriptUrl, null);
      return null;
    }

    let sourceMapUrl = match[1];
    if (!sourceMapUrl.startsWith("http") && !sourceMapUrl.startsWith("data:")) {
      const scriptBase = scriptUrl.substring(0, scriptUrl.lastIndexOf("/") + 1);
      sourceMapUrl = scriptBase + sourceMapUrl;
    }

    let sourceMapJson: string | null;
    if (sourceMapUrl.startsWith("data:")) {
      const dataMatch = sourceMapUrl.match(/^data:[^,]*base64,(.*)$/);
      if (dataMatch) {
        sourceMapJson = Buffer.from(dataMatch[1], "base64").toString("utf-8");
      } else {
        sourceMapJson = null;
      }
    } else {
      sourceMapJson = await fetchText(sourceMapUrl);
    }

    if (!sourceMapJson) {
      this.#traceMaps.set(scriptUrl, null);
      return null;
    }

    try {
      // Import TraceMap dynamically to avoid bundling issues
      const { TraceMap } = await import("@jridgewell/trace-mapping");
      const traceMap = new TraceMap(sourceMapJson);
      this.#traceMaps.set(scriptUrl, traceMap);
      return traceMap;
    } catch {
      this.#traceMaps.set(scriptUrl, null);
      return null;
    }
  }

  async resolve(scriptUrl: string, line0Based: number, column: number): Promise<ResolvedLocation | null> {
    const traceMap = await this.getTraceMap(scriptUrl);
    if (!traceMap || line0Based < 0) return null;

    try {
      const { originalPositionFor } = await import("@jridgewell/trace-mapping");
      const result = originalPositionFor(traceMap, { line: line0Based, column });

      if (!result.source) return null;

      const sourcePath = result.source;
      const sourceFile = sourcePath.split("/").pop() || sourcePath;

      return {
        source: sourceFile,
        file: sourceFile,
        line: result.line ?? (line0Based + 1),
        column: result.column ?? column,
        name: result.name,
      };
    } catch {
      return null;
    }
  }
}
