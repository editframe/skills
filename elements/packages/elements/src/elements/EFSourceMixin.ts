import type { LitElement } from "lit";
import { property } from "lit/decorators/property.js";

export declare class EFSourceMixinInterface {
  apiHost?: string;
  productionSrc(): string;
  src: string;
}

interface EFSourceMixinOptions {
  assetType: string;
}
type Constructor<T = {}> = new (...args: any[]) => T;
export function EFSourceMixin<T extends Constructor<LitElement>>(
  superClass: T,
  options: EFSourceMixinOptions,
) {
  class EFSourceElement extends superClass {
    get apiHost() {
      const apiHost =
        (this.closest("ef-configuration") as any)?.apiHost ??
        (this.closest("ef-workbench") as any)?.apiHost ??
        (this.closest("ef-preview") as any)?.apiHost;

      // Return undefined instead of defaulting to external URL
      // This allows components to use current origin when apiHost is not set
      return apiHost;
    }

    @property({ type: String, reflect: true })
    src = "";

    #md5Value: string | undefined = undefined;
    #md5Promise: Promise<string | undefined> | null = null;
    #md5LastSrc: string | null = null;

    productionSrc() {
      if (!this.#md5Value) {
        throw new Error(
          `MD5 sum not available for ${this}. Cannot generate production URL`,
        );
      }

      if (!this.apiHost) {
        throw new Error(
          `apiHost not available for ${this}. Cannot generate production URL`,
        );
      }

      return `${this.apiHost}/api/v1/${options.assetType}/${this.#md5Value}`;
    }

    /**
     * Load MD5 sum for the current source
     */
    async loadMd5Sum(signal?: AbortSignal): Promise<string | undefined> {
      if (this.#md5LastSrc === this.src && this.#md5Value) {
        return this.#md5Value;
      }

      if (this.#md5Promise && this.#md5LastSrc === this.src) {
        return this.#md5Promise;
      }

      this.#md5LastSrc = this.src;
      this.#md5Promise = this.#doLoadMd5(this.src, signal);

      try {
        this.#md5Value = await this.#md5Promise;
        return this.#md5Value;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          throw error;
        }
        console.error("EFSourceMixin md5Sum error", error);
        return undefined;
      } finally {
        this.#md5Promise = null;
      }
    }

    async #doLoadMd5(
      src: string,
      signal?: AbortSignal,
    ): Promise<string | undefined> {
      // Normalize the path: remove leading slash and any double slashes
      let normalizedSrc = src.startsWith("/") ? src.slice(1) : src;
      normalizedSrc = normalizedSrc.replace(/^\/+/, "");
      // Use production API format for local files
      const md5Path = `/api/v1/files/local/md5?src=${encodeURIComponent(normalizedSrc)}`;
      const response = await fetch(md5Path, { signal });
      if (!response.ok) {
        return undefined;
      }
      const data = await response.json();
      return data.md5 ?? undefined;
    }

    /**
     * Compatibility wrapper for code expecting md5SumLoader.value
     */
    md5SumLoader = new Proxy(
      {
        run: () => this.loadMd5Sum(),
        _host: this as unknown,
      } as {
        run: () => Promise<string | undefined>;
        value: string | undefined;
        taskComplete: Promise<string | undefined>;
        _host: unknown;
      },
      {
        get(target, prop) {
          if (prop === "value") {
            const host = target._host as any;
            return host.#md5Value;
          }
          if (prop === "taskComplete") {
            const host = target._host as any;
            return host.#md5Promise || Promise.resolve(host.#md5Value);
          }
          return (target as any)[prop];
        },
      },
    );
  }

  return EFSourceElement as Constructor<EFSourceMixinInterface> & T;
}
