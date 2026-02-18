import { ContextProvider, consume, createContext, provide } from "@lit/context";
import type { LitElement } from "lit";
import { property, state } from "lit/decorators.js";
import { EF_RENDERING } from "../EF_RENDERING.ts";
import {
  isEFTemporal,
  type TemporalMixinInterface,
} from "../elements/EFTemporal.js";
import { globalURLTokenDeduplicator } from "../transcoding/cache/URLTokenDeduplicator.js";
import { currentTimeContext } from "./currentTimeContext.js";
import { durationContext } from "./durationContext.js";
import {
  type EFConfiguration,
  efConfigurationContext,
} from "./EFConfiguration.ts";
import { efContext } from "./efContext.js";
import { fetchContext } from "./fetchContext.js";
import { type FocusContext, focusContext } from "./focusContext.js";
import { focusedElementContext } from "./focusedElementContext.js";
import { loopContext, playingContext } from "./playingContext.js";

export const targetTemporalContext =
  createContext<TemporalMixinInterface | null>(Symbol("target-temporal"));

export declare class ContextMixinInterface extends LitElement {
  signingURL?: string;
  apiHost?: string;
  rendering: boolean;
  playing: boolean;
  loop: boolean;
  currentTimeMs: number;
  focusedElement?: HTMLElement;
  targetTemporal: TemporalMixinInterface | null;
  play(): Promise<void>;
  pause(): void;
}

const contextMixinSymbol = Symbol("contextMixin");

export function isContextMixin(value: any): value is ContextMixinInterface {
  return (
    typeof value === "object" &&
    value !== null &&
    contextMixinSymbol in value.constructor
  );
}

type Constructor<T = {}> = new (...args: any[]) => T;
export function ContextMixin<T extends Constructor<LitElement>>(superClass: T) {
  class ContextElement extends superClass {
    static [contextMixinSymbol] = true;

    @consume({ context: efConfigurationContext, subscribe: true })
    efConfiguration: EFConfiguration | null = null;

    @provide({ context: focusContext })
    focusContext = this as FocusContext;

    @provide({ context: focusedElementContext })
    @state()
    focusedElement?: HTMLElement;

    #playingProvider!: ContextProvider<typeof playingContext>;
    #loopProvider!: ContextProvider<typeof loopContext>;
    #currentTimeMsProvider!: ContextProvider<typeof currentTimeContext>;
    #targetTemporalProvider!: ContextProvider<typeof targetTemporalContext>;

    #loop = false;

    #apiHost?: string;
    @property({ type: String, attribute: "api-host" })
    get apiHost() {
      return this.#apiHost ?? this.efConfiguration?.apiHost ?? "";
    }

    set apiHost(value: string) {
      this.#apiHost = value;
    }

    @provide({ context: efContext })
    efContext = this;

    #targetTemporal: TemporalMixinInterface | null = null;

    @state()
    get targetTemporal(): TemporalMixinInterface | null {
      return this.#targetTemporal;
    }
    #controllerSubscribed = false;

    /**
     * Find the first root temporal element (recursively searches through children)
     * Supports ef-timegroup, ef-video, ef-audio, and any other temporal elements
     * even when they're wrapped in non-temporal elements like divs
     */
    private findRootTemporal(): TemporalMixinInterface | null {
      const findRecursive = (
        element: Element,
      ): TemporalMixinInterface | null => {
        if (isEFTemporal(element)) {
          return element as TemporalMixinInterface & HTMLElement;
        }

        for (const child of element.children) {
          const found = findRecursive(child);
          if (found) return found;
        }

        return null;
      };

      for (const child of this.children) {
        const found = findRecursive(child);
        if (found) return found;
      }

      return null;
    }

    #subscribedController: any = null;

    set targetTemporal(value: TemporalMixinInterface | null) {
      if (
        this.#targetTemporal === value &&
        value?.playbackController === this.#subscribedController &&
        this.#controllerSubscribed
      )
        return;

      // Unsubscribe from old controller updates
      if (this.#subscribedController) {
        this.#subscribedController.removeListener(this.#onControllerUpdate);
        this.#controllerSubscribed = false;
        this.#subscribedController = null;
      }

      this.#targetTemporal = value;
      this.#targetTemporalProvider?.setValue(value);

      // Sync all provided contexts
      this.requestUpdate("targetTemporal");
      this.requestUpdate("playing");
      this.requestUpdate("loop");
      this.requestUpdate("currentTimeMs");

      // If the new targetTemporal has a playbackController, apply stored loop value immediately
      if (value?.playbackController && this.#loop) {
        value.playbackController.setLoop(this.#loop);
      }

      // If the new targetTemporal doesn't have a playbackController yet,
      // wait for it to complete its updates (it might be initializing)
      if (value && !value.playbackController) {
        // Wait for the temporal element to initialize
        (value as any).updateComplete?.then(() => {
          if (value === this.#targetTemporal && !this.#controllerSubscribed) {
            this.requestUpdate();
          }
        });
      }
    }

    #onControllerUpdate = (
      event: import("./PlaybackController.js").PlaybackControllerUpdateEvent,
    ) => {
      switch (event.property) {
        case "playing":
          this.#playingProvider.setValue(event.value as boolean);
          break;
        case "loop":
          this.#loopProvider.setValue(event.value as boolean);
          break;
        case "currentTimeMs":
          this.#currentTimeMsProvider.setValue(event.value as number);
          break;
      }
    };

    // Add reactive properties that depend on the targetTemporal
    @provide({ context: durationContext })
    @property({ type: Number })
    durationMs = 0;

    @property({ type: Number })
    endTimeMs = 0;

    @provide({ context: fetchContext })
    fetch = async (url: string, init: RequestInit = {}) => {
      if (init.body) {
        init.headers ||= {};
        Object.assign(init.headers, {
          "Content-Type": "application/json",
        });
      }

      // Check if this is a local @ef-* endpoint that doesn't need authentication
      // These endpoints are handled by the Vite plugin locally and don't require signing
      const isLocalEndpoint = url.startsWith("/@ef-");

      if (!EF_RENDERING() && this.signingURL && !isLocalEndpoint) {
        const { cacheKey, signingPayload } = this.#getTokenCacheKey(url);

        // Use global token deduplicator to share tokens across all context providers
        const urlToken = await globalURLTokenDeduplicator.getToken(
          cacheKey,
          async () => {
            try {
              const response = await fetch(this.signingURL, {
                method: "POST",
                body: JSON.stringify(signingPayload),
              });

              if (response.ok) {
                const tokenData = await response.json();
                return tokenData.token;
              }
              throw new Error(
                `Failed to sign URL: ${url}. SigningURL: ${this.signingURL} ${response.status} ${response.statusText}`,
              );
            } catch (error) {
              console.error("ContextMixin urlToken fetch error", url, error);
              throw error;
            }
          },
          (token: string) => this.#parseTokenExpiration(token),
        );

        init.headers ||= {};
        Object.assign(init.headers, {
          authorization: `Bearer ${urlToken}`,
        });
      } else {
        // Only include credentials for same-origin requests where session cookies
        // are relevant. For cross-origin requests without a signing URL, credentials
        // cause CORS failures when the server responds with Access-Control-Allow-Origin: *
        if (!this.#isCrossOrigin(url)) {
          init.credentials = "include";
        }

        if (this.#isEditframeDomain(url)) {
          console.warn(
            `[Editframe] Request to ${new URL(url).hostname} has no signing URL configured. ` +
              `Ensure <ef-configuration signing-url="..."> is an ancestor of your <ef-preview> or <ef-workbench>.`,
          );
        }
      }

      try {
        const fetchPromise = fetch(url, init);
        // Wrap the promise to catch rejections and log the URL
        // Return the promise chain so errors are logged but still propagate
        return fetchPromise.catch((error) => {
          // For AbortErrors, re-throw directly without modification
          // DOMException properties like 'name' are read-only
          if (error instanceof DOMException && error.name === "AbortError") {
            throw error;
          }

          console.error(
            "ContextMixin fetch error",
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
          // Preserve the original error's properties (except for DOMException which has read-only properties)
          if (error instanceof Error && !(error instanceof DOMException)) {
            enhancedError.name = error.name;
            enhancedError.stack = error.stack;
            // Copy any additional properties from the original error
            Object.assign(enhancedError, error);
          }
          throw enhancedError;
        });
      } catch (error) {
        console.error(
          "ContextMixin fetch error (synchronous)",
          url,
          error,
          window.location.href,
        );
        throw error;
      }
    };

    // Note: URL token caching is now handled globally via URLTokenDeduplicator
    // Keeping these for any potential backwards compatibility, but they're no longer used

    /**
     * Generate a cache key for URL token based on signing strategy
     *
     * Uses unified prefix + parameter matching approach:
     * - For transcode URLs: signs base "/api/v1/transcode" + params like {url: "source.mp4"}
     * - For regular URLs: signs full URL with empty params {}
     * - All validation uses prefix matching + exhaustive parameter matching
     * - Multiple transcode segments with same source share one token (reduces round-trips)
     */
    #isCrossOrigin(url: string): boolean {
      try {
        const targetUrl = new URL(url, window.location.origin);
        return targetUrl.origin !== window.location.origin;
      } catch {
        return false;
      }
    }

    #isEditframeDomain(url: string): boolean {
      try {
        const hostname = new URL(url).hostname;
        return (
          hostname === "editframe.dev" ||
          hostname === "editframe.com" ||
          hostname.endsWith(".editframe.dev") ||
          hostname.endsWith(".editframe.com")
        );
      } catch {
        return false;
      }
    }

    #getTokenCacheKey(url: string): {
      cacheKey: string;
      signingPayload: { url: string; params?: Record<string, string> };
    } {
      try {
        const urlObj = new URL(url);

        // Check if this is a transcode URL pattern
        if (urlObj.pathname.includes("/api/v1/transcode/")) {
          const urlParam = urlObj.searchParams.get("url");
          if (urlParam) {
            // For transcode URLs, sign the base path + url parameter
            const basePath = `${urlObj.origin}/api/v1/transcode`;
            const cacheKey = `${basePath}?url=${urlParam}`;
            return {
              cacheKey,
              signingPayload: { url: basePath, params: { url: urlParam } },
            };
          }
        }

        // For non-transcode URLs, use full URL (existing behavior)
        return {
          cacheKey: url,
          signingPayload: { url },
        };
      } catch {
        // If URL parsing fails, fall back to full URL
        return {
          cacheKey: url,
          signingPayload: { url },
        };
      }
    }

    /**
     * Parse JWT token to extract safe expiration time (with buffer)
     * @param token JWT token string
     * @returns Safe expiration timestamp in milliseconds (actual expiry minus buffer), or 0 if parsing fails
     */
    #parseTokenExpiration(token: string): number {
      try {
        // JWT has 3 parts separated by dots: header.payload.signature
        const parts = token.split(".");
        if (parts.length !== 3) return 0;

        // Decode the payload (second part)
        const payload = parts[1];
        if (!payload) return 0;

        const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
        const parsed = JSON.parse(decoded);

        // Extract timestamps (in seconds)
        const exp = parsed.exp;
        const iat = parsed.iat;
        if (!exp) return 0;

        // Calculate token lifetime and buffer
        const lifetimeSeconds = iat ? exp - iat : 3600; // Default to 1 hour if no iat
        const tenPercentBufferMs = lifetimeSeconds * 0.1 * 1000; // 10% of lifetime in ms
        const fiveMinutesMs = 5 * 60 * 1000; // 5 minutes in ms

        // Use whichever buffer is smaller (more conservative)
        const bufferMs = Math.min(fiveMinutesMs, tenPercentBufferMs);

        // Return expiration time minus buffer
        return exp * 1000 - bufferMs;
      } catch {
        return 0;
      }
    }

    #signingURL?: string;
    /**
     * A URL that will be used to generated signed tokens for accessing media files from the
     * editframe API. This is used to authenticate media requests per-user.
     */
    @property({ type: String, attribute: "signing-url" })
    get signingURL() {
      return this.#signingURL ?? this.efConfiguration?.signingURL ?? "";
    }
    set signingURL(value: string) {
      this.#signingURL = value;
    }

    @property({ type: Boolean, reflect: true })
    get playing(): boolean {
      return this.targetTemporal?.playbackController?.playing ?? false;
    }
    set playing(value: boolean) {
      if (this.targetTemporal?.playbackController) {
        this.targetTemporal.playbackController.setPlaying(value);
      }
    }

    @property({ type: Boolean, reflect: true, attribute: "loop" })
    get loop(): boolean {
      return this.targetTemporal?.playbackController?.loop ?? this.#loop;
    }
    set loop(value: boolean) {
      const oldValue = this.#loop;
      this.#loop = value;
      if (this.targetTemporal?.playbackController) {
        this.targetTemporal.playbackController.setLoop(value);
      }
      this.requestUpdate("loop", oldValue);
    }

    @property({ type: Boolean })
    rendering = false;

    @property({ type: Number })
    get currentTimeMs(): number {
      return (
        this.targetTemporal?.playbackController?.currentTimeMs ?? Number.NaN
      );
    }
    set currentTimeMs(value: number) {
      if (this.targetTemporal?.playbackController) {
        this.targetTemporal.playbackController.setCurrentTimeMs(value);
      }
    }

    #timegroupObserver = new MutationObserver((mutations) => {
      let shouldUpdate = false;
      const undefinedEFTags = new Set<string>();

      for (const mutation of mutations) {
        if (mutation.type === "childList") {
          const newTemporal = this.findRootTemporal();
          if (newTemporal !== this.targetTemporal) {
            this.targetTemporal = newTemporal;
            shouldUpdate = true;
          } else if (
            mutation.target instanceof Element &&
            isEFTemporal(mutation.target)
          ) {
            // Handle childList changes within existing temporal elements
            shouldUpdate = true;
          }

          // Collect ef-* tags from added nodes that haven't upgraded yet.
          // When React hydrates or TimelineRoot renders, the custom element
          // may be inserted before its class is defined, so isEFTemporal()
          // returns false. We need to retry after the element upgrades.
          if (!this.targetTemporal) {
            for (const node of mutation.addedNodes) {
              if (node instanceof Element) {
                this.#collectUndefinedEFTags(node, undefinedEFTags);
              }
            }
          }
        } else if (mutation.type === "attributes") {
          // Watch for attribute changes that might affect duration
          const durationAffectingAttributes = [
            "duration",
            "mode",
            "trimstart",
            "trimend",
            "sourcein",
            "sourceout",
          ];

          if (
            durationAffectingAttributes.includes(
              mutation.attributeName || "",
            ) ||
            (mutation.target instanceof Element &&
              isEFTemporal(mutation.target))
          ) {
            shouldUpdate = true;
          }
        }
      }

      if (undefinedEFTags.size > 0) {
        this.#retryTemporalDiscovery(undefinedEFTags);
      }

      if (shouldUpdate) {
        // Trigger an update to ensure reactive properties recalculate
        // Use a microtask to ensure DOM updates are complete
        queueMicrotask(() => {
          // Recalculate duration and endTime when temporal element changes
          this.updateDurationProperties();
          this.requestUpdate();
          // Also ensure the targetTemporal updates its computed properties
          if (this.targetTemporal) {
            (this.targetTemporal as any).requestUpdate();
          }
        });
      }
    });

    /**
     * Recursively collect ef-* tag names from an element tree that
     * have not yet been registered as custom elements.
     */
    #collectUndefinedEFTags(el: Element, tags: Set<string>): void {
      const tag = el.tagName.toLowerCase();
      if (tag.startsWith("ef-") && !customElements.get(tag)) {
        tags.add(tag);
      }
      for (const child of el.children) {
        this.#collectUndefinedEFTags(child, tags);
      }
    }

    /**
     * Wait for unregistered ef-* custom elements to upgrade, then
     * retry findRootTemporal(). Mirrors the whenDefined pattern in play().
     */
    async #retryTemporalDiscovery(tags: Set<string>): Promise<void> {
      await Promise.all(
        [...tags].map((tag) => customElements.whenDefined(tag).catch(() => {})),
      );

      if (this.targetTemporal) return; // already found by another path

      const found = this.findRootTemporal();
      if (found) {
        this.targetTemporal = found;
        await (found as any).updateComplete;
        this.updateDurationProperties();
        this.requestUpdate();
      }
    }

    /**
     * Update duration properties when temporal element changes
     */
    updateDurationProperties(): void {
      const newDuration = this.targetTemporal?.durationMs ?? 0;
      const newEndTime = this.targetTemporal?.endTimeMs ?? 0;

      if (this.durationMs !== newDuration) {
        this.durationMs = newDuration;
      }

      if (this.endTimeMs !== newEndTime) {
        this.endTimeMs = newEndTime;
      }
    }

    connectedCallback(): void {
      super.connectedCallback();

      // Create manual context providers for playback state
      this.#playingProvider = new ContextProvider(this, {
        context: playingContext,
        initialValue: this.playing,
      });
      this.#loopProvider = new ContextProvider(this, {
        context: loopContext,
        initialValue: this.loop,
      });
      this.#currentTimeMsProvider = new ContextProvider(this, {
        context: currentTimeContext,
        initialValue: this.currentTimeMs,
      });
      this.#targetTemporalProvider = new ContextProvider(this, {
        context: targetTemporalContext,
        initialValue: this.targetTemporal,
      });

      // Initialize targetTemporal to first root temporal element
      this.targetTemporal = this.findRootTemporal();
      // Initialize duration properties
      this.updateDurationProperties();

      this.#timegroupObserver.observe(this, {
        childList: true,
        subtree: true,
        attributes: true,
      });
    }

    disconnectedCallback(): void {
      super.disconnectedCallback();
      this.#timegroupObserver.disconnect();

      // Unsubscribe from controller
      if (this.#subscribedController) {
        this.#subscribedController.removeListener(this.#onControllerUpdate);
        this.#controllerSubscribed = false;
        this.#subscribedController = null;
      }

      this.pause();
    }

    updated(changedProperties: Map<string | number | symbol, unknown>) {
      super.updated?.(changedProperties);

      // Subscribe to controller when it becomes available or changes
      const currentController = this.#targetTemporal?.playbackController;
      if (
        currentController &&
        (!this.#controllerSubscribed ||
          this.#subscribedController !== currentController)
      ) {
        // Unsubscribe from old controller if it changed
        if (
          this.#subscribedController &&
          this.#subscribedController !== currentController
        ) {
          this.#subscribedController.removeListener(this.#onControllerUpdate);
        }
        currentController.addListener(this.#onControllerUpdate);
        this.#controllerSubscribed = true;
        this.#subscribedController = currentController;

        // Apply stored loop value when playbackController becomes available
        if (this.#loop) {
          currentController.setLoop(this.#loop);
        }

        // Trigger initial sync of context providers
        this.#playingProvider.setValue(this.playing);
        this.#loopProvider.setValue(this.loop);
        this.#currentTimeMsProvider.setValue(this.currentTimeMs);
      }
    }

    async play() {
      // If targetTemporal is not set, try to find it now
      // This handles cases where the DOM may not have been fully ready during connectedCallback
      if (!this.targetTemporal) {
        // Wait for any temporal custom elements to be defined
        const potentialTemporalTags = Array.from(this.children)
          .map((el) => el.tagName.toLowerCase())
          .filter((tag) => tag.startsWith("ef-"));

        await Promise.all(
          potentialTemporalTags.map((tag) =>
            customElements.whenDefined(tag).catch(() => {}),
          ),
        );

        const foundTemporal = this.findRootTemporal();
        if (foundTemporal) {
          this.targetTemporal = foundTemporal;
          // Wait for it to initialize
          await (foundTemporal as any).updateComplete;
        } else {
          console.warn("No temporal element found to play");
          return;
        }
      }

      // If playbackController doesn't exist yet, wait for it
      if (!this.targetTemporal.playbackController) {
        await (this.targetTemporal as any).updateComplete;
        // After waiting, check again
        if (!this.targetTemporal.playbackController) {
          console.warn("PlaybackController not available for temporal element");
          return;
        }
      }

      this.targetTemporal.playbackController.play();
    }

    pause() {
      if (this.targetTemporal?.playbackController) {
        this.targetTemporal.playbackController.pause();
      }
    }
  }

  return ContextElement as Constructor<ContextMixinInterface> & T;
}
