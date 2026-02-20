import { withSpan } from "../../otel/tracingHelpers.js";
import { RequestDeduplicator } from "../../transcoding/cache/RequestDeduplicator.js";
import { SizeAwareLRUCache } from "../../utils/LRUCache.js";

export const mediaCache = new SizeAwareLRUCache<string>(100 * 1024 * 1024);
export const globalRequestDeduplicator = new RequestDeduplicator();

export interface FetchFn {
  (url: string, init?: { headers?: Record<string, string>; signal?: AbortSignal }): Promise<Response>;
}

export class CachedFetcher {
  #fetchFn: FetchFn;

  constructor(fetchFn: FetchFn) {
    this.#fetchFn = fetchFn;
  }

  has(key: string): boolean {
    return mediaCache.has(key);
  }

  async fetchArrayBuffer(
    url: string,
    signal?: AbortSignal,
  ): Promise<ArrayBuffer> {
    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }
    return this.#fetchWithCache(url, { responseType: "arrayBuffer", signal });
  }

  async fetchJson(url: string, signal?: AbortSignal): Promise<any> {
    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }
    return this.#fetchWithCache(url, { responseType: "json", signal });
  }

  async #fetchWithCache(
    url: string,
    options: {
      responseType: "arrayBuffer" | "json";
      headers?: Record<string, string>;
      signal?: AbortSignal;
    },
  ): Promise<any> {
    return withSpan(
      "cachedFetcher.fetchWithCache",
      {
        url: url.length > 100 ? `${url.substring(0, 100)}...` : url,
        responseType: options.responseType,
      },
      undefined,
      async (span) => {
        const { responseType, headers, signal } = options;

        const cacheKey = headers ? `${url}:${JSON.stringify(headers)}` : url;

        const cached = mediaCache.get(cacheKey);
        if (cached) {
          span.setAttribute("cacheHit", true);
          if (signal) {
            return this.#handleAbortForCachedRequest(cached, signal);
          }
          return cached;
        }

        span.setAttribute("cacheHit", false);

        const promise = globalRequestDeduplicator.executeRequest(
          cacheKey,
          async () => {
            try {
              const response = await this.#fetchFn(url, { headers, signal });
              const contentType = response.headers.get("content-type");

              if (responseType === "json") {
                if (
                  !response.ok ||
                  (contentType &&
                    !contentType.includes("application/json") &&
                    !contentType.includes("text/json"))
                ) {
                  const text = await response.clone().text();
                  if (!response.ok) {
                    throw new Error(
                      `Failed to fetch: ${response.status} ${text.substring(0, 100)}`,
                    );
                  }
                  throw new Error(
                    `Expected JSON but got ${contentType}: ${text.substring(0, 100)}`,
                  );
                }
                try {
                  return await response.json();
                } catch (error) {
                  throw new Error(
                    `Failed to parse JSON response: ${error instanceof Error ? error.message : String(error)}`,
                  );
                }
              }

              if (!response.ok) {
                const text = await response.clone().text();
                throw new Error(
                  `Failed to fetch: ${response.status} ${text.substring(0, 100)}`,
                );
              }

              const buffer = await response.arrayBuffer();
              span.setAttribute("sizeBytes", buffer.byteLength);
              return buffer;
            } catch (error) {
              if (
                error instanceof DOMException &&
                error.name === "AbortError"
              ) {
                mediaCache.delete(cacheKey);
              }
              throw error;
            }
          },
        );

        mediaCache.set(cacheKey, promise);

        promise.catch((error) => {
          if (error instanceof DOMException && error.name === "AbortError") {
            mediaCache.delete(cacheKey);
          }
        });

        if (signal) {
          return this.#handleAbortForCachedRequest(promise, signal);
        }

        return promise;
      },
    );
  }

  #handleAbortForCachedRequest<T>(
    promise: Promise<T>,
    signal: AbortSignal,
  ): Promise<T> {
    if (signal.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    const abortPromise = new Promise<never>((_, reject) => {
      signal.addEventListener("abort", () => {
        reject(new DOMException("Aborted", "AbortError"));
      });
    });
    abortPromise.catch(() => {});

    const racePromise = Promise.race([promise, abortPromise]);
    racePromise.catch(() => {});
    return racePromise;
  }
}
