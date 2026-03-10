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
          // Don't log AbortError - these are intentional request cancellations
          const isAbortError =
            error instanceof Error &&
            (error.name === "AbortError" ||
              error.message.includes("signal is aborted") ||
              error.message.includes("The user aborted a request"));

          // Don't log errors if element is disconnected from DOM
          // This happens during scenario transitions when elements are removed mid-fetch
          // The browser throws TypeError: "Failed to fetch" when the page navigates
          const isDisconnected = !this.isConnected;

          // Also suppress "Failed to fetch" TypeError when disconnected
          // These occur when the browser aborts a request due to page navigation,
          // but doesn't throw a proper AbortError
          const isNavigationAbort =
            isDisconnected && error instanceof TypeError && error.message === "Failed to fetch";

          // For AbortErrors, navigation aborts, and disconnected elements,
          // re-throw the original error without enhancement to preserve error type
          if (isAbortError || isNavigationAbort || isDisconnected) {
            throw error;
          }

          // Log unexpected errors
          console.error("FetchMixin fetch error", url, error, window.location.href);

          // Create a new error with the URL in the message, preserving the original error type
          const ErrorConstructor = error instanceof Error ? error.constructor : Error;
          const enhancedError = new (ErrorConstructor as typeof Error)(
            `Failed to fetch: ${url}. Original error: ${error instanceof Error ? error.message : String(error)}`,
          );
          // Preserve the original error's properties
          if (error instanceof Error) {
            // Some error types (like DOMException) have read-only name property
            // Use try-catch to handle cases where name cannot be set
            try {
              enhancedError.name = error.name;
            } catch {
              // If name is read-only, use Object.defineProperty as fallback
              try {
                Object.defineProperty(enhancedError, "name", {
                  value: error.name,
                  writable: true,
                  enumerable: false,
                  configurable: true,
                });
              } catch {
                // If that also fails, just skip setting name
              }
            }
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
