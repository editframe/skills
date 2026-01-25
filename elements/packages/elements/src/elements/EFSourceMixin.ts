import { Task } from "@lit/task";
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
        this.closest("ef-configuration")?.apiHost ??
        this.closest("ef-workbench")?.apiHost ??
        this.closest("ef-preview")?.apiHost;

      // Return undefined instead of defaulting to external URL
      // This allows components to use current origin when apiHost is not set
      return apiHost;
    }

    @property({ type: String })
    src = "";

    productionSrc() {
      if (!this.md5SumLoader.value) {
        throw new Error(
          `MD5 sum not available for ${this}. Cannot generate production URL`,
        );
      }

      if (!this.apiHost) {
        throw new Error(
          `apiHost not available for ${this}. Cannot generate production URL`,
        );
      }

      return `${this.apiHost}/api/v1/${options.assetType}/${this.md5SumLoader.value}`;
    }

    md5SumLoader = new Task(this, {
      autoRun: false,
      args: () => [this.src] as const,
      onError: (error) => {
        // Attach catch to prevent unhandled rejection
        this.md5SumLoader.taskComplete.catch(() => {});
        
        // Don't log AbortErrors - these are expected when element is disconnected
        const isAbortError = 
          error instanceof DOMException && error.name === "AbortError" ||
          error instanceof Error && (
            error.name === "AbortError" ||
            error.message?.includes("signal is aborted") ||
            error.message?.includes("The user aborted a request")
          );
        
        if (isAbortError) {
          return;
        }
        console.error("EFSourceMixin md5SumLoader error", error);
      },
      task: async ([src], { signal }) => {
        // Normalize the path: remove leading slash and any double slashes
        let normalizedSrc = src.startsWith("/")
          ? src.slice(1)
          : src;
        normalizedSrc = normalizedSrc.replace(/^\/+/, "");
        // Use production API format for local files
        const md5Path = `/api/v1/isobmff_files/local/md5?src=${encodeURIComponent(normalizedSrc)}`;
        const response = await fetch(md5Path, { signal });
        if (!response.ok) {
          return undefined;
        }
        const data = await response.json();
        return data.md5 ?? undefined;
      },
    });
  }

  return EFSourceElement as Constructor<EFSourceMixinInterface> & T;
}
