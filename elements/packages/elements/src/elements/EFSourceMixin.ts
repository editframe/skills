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

      return apiHost || "https://editframe.dev";
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
      task: async ([src], { signal }) => {
        const md5Path = `/@ef-asset/${src}`;
        const response = await fetch(md5Path, { method: "HEAD", signal });
        return response.headers.get("etag") ?? undefined;
      },
    });
  }

  return EFSourceElement as Constructor<EFSourceMixinInterface> & T;
}
