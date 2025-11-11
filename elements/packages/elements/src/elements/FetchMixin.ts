import type { LitElement } from "lit";

export declare class FetchMixinInterface {
  fetch: typeof fetch;
}

type Constructor<T = {}> = new (...args: any[]) => T;
export function FetchMixin<T extends Constructor<LitElement>>(superClass: T) {
  class FetchElement extends superClass {
    fetch = (url: string, init?: RequestInit): Promise<Response> => {
      try {
        let fetchPromise: Promise<Response>;

        // Look for context providers up the DOM tree
        const workbench = this.closest("ef-workbench") as any;
        if (workbench?.fetch) {
          fetchPromise = workbench.fetch(url, init);
        } else {
          const preview = this.closest("ef-preview") as any;
          if (preview?.fetch) {
            fetchPromise = preview.fetch(url, init);
          } else {
            const configuration = this.closest("ef-configuration") as any;
            if (configuration?.fetch) {
              fetchPromise = configuration.fetch(url, init);
            } else {
              // Fallback to window.fetch
              fetchPromise = window.fetch(url, init);
            }
          }
        }

        // Wrap the promise to catch rejections and log the URL
        // Return the promise chain so errors are logged but still propagate
        return fetchPromise.catch((error) => {
          console.error(
            "FetchMixin fetch error",
            url,
            error,
            window.location.href,
          );
          // Create a new error with the URL in the message, preserving the original error type
          const ErrorConstructor =
            error instanceof Error ? error.constructor : Error;
          const enhancedError = new (ErrorConstructor as typeof Error)(
            `Failed to fetch: ${url}. Original error: ${error instanceof Error ? error.message : String(error)}`,
          );
          // Preserve the original error's properties
          if (error instanceof Error) {
            enhancedError.name = error.name;
            enhancedError.stack = error.stack;
            // Copy any additional properties from the original error
            Object.assign(enhancedError, error);
          }
          throw enhancedError;
        });
      } catch (error) {
        console.error("FetchMixin error (synchronous)", url, error);
        throw error;
      }
    };
  }

  return FetchElement as Constructor<FetchMixinInterface> & T;
}
