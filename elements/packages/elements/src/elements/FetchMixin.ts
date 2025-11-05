import type { LitElement } from "lit";

export declare class FetchMixinInterface {
  fetch: typeof fetch;
}

type Constructor<T = {}> = new (...args: any[]) => T;
export function FetchMixin<T extends Constructor<LitElement>>(superClass: T) {
  class FetchElement extends superClass {
    fetch = (url: string, init?: RequestInit): Promise<Response> => {
      try {
        // Look for context providers up the DOM tree
        const workbench = this.closest("ef-workbench") as any;
        if (workbench?.fetch) {
          return workbench.fetch(url, init);
        }

        const preview = this.closest("ef-preview") as any;
        if (preview?.fetch) {
          return preview.fetch(url, init);
        }

        const configuration = this.closest("ef-configuration") as any;
        if (configuration?.fetch) {
          return configuration.fetch(url, init);
        }

        // Fallback to window.fetch
        return window.fetch(url, init);
      } catch (error) {
        console.error("FetchMixin error", url, error);
        throw error;
      }
    };
  }

  return FetchElement as Constructor<FetchMixinInterface> & T;
}
