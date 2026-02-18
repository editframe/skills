import type { Context } from "@lit/context";
import { ContextEvent } from "@lit/context";
import type { LitElement, ReactiveController } from "lit";

/**
 * Configuration for context proxying
 */
export type ContextProxyConfig = {
  target: () => HTMLElement | null;
  contexts: Context<any, any>[];
};

/**
 * A ReactiveController that proxies context requests to a target element.
 *
 * Usage:
 * ```typescript
 * @customElement('my-proxy')
 * class MyProxy extends LitElement {
 *   @state()
 *   targetElement: HTMLElement | null = null;
 *
 *   // @ts-expect-error controller is intentionally not referenced directly
 *   #contextProxyController = new ContextProxyController(this, {
 *     target: () => this.targetElement,
 *     contexts: [playingContext, loopContext, targetTemporalContext]
 *   });
 * }
 * ```
 */
export class ContextProxyController implements ReactiveController {
  private host: LitElement;
  private proxyMap = new Map<Context<any, any>, () => HTMLElement | null>();
  private pendingRequests: ContextEvent<any>[] = [];

  constructor(host: LitElement, config: ContextProxyConfig) {
    this.host = host;
    this.host.addController(this);

    // Build the proxy map
    for (const context of config.contexts) {
      this.proxyMap.set(context, config.target);
    }
  }

  hostConnected(): void {
  }

  hostDisconnected(): void {
    this.host.removeEventListener("context-request", this.handleContextRequest);
  }

  hostUpdate(): void {
    // Process any pending requests when the host updates (e.g., when targetElement changes)
    this.processPendingRequests();
  }

  private processPendingRequests(): void {
    if (this.pendingRequests.length === 0) return;

    // Process all pending requests
    const requestsToProcess = [...this.pendingRequests];
    this.pendingRequests = [];

    for (const contextEvent of requestsToProcess) {
      this.processContextRequest(contextEvent);
    }
  }

  private handleContextRequest = (event: Event): void => {
    const contextEvent = event as ContextEvent<any>;

    // Check if we should proxy this context
    console.log("targetGetter?", contextEvent.context);
    const targetGetter = this.proxyMap.get(contextEvent.context);

    if (targetGetter) {
      // Always stop propagation for contexts we handle
      contextEvent.stopPropagation();

      // Try to process the request immediately
      const processed = this.processContextRequest(contextEvent);

      if (!processed) {
        this.pendingRequests.push(contextEvent);
      }
    }
  };

  private processContextRequest(contextEvent: ContextEvent<any>): boolean {
    const targetGetter = this.proxyMap.get(contextEvent.context);
    console.log("targetGetter?", targetGetter);
    if (!targetGetter) return false;

    // Get the target element using the getter function
    const targetElement = targetGetter();

    console.log("targetElement?", targetElement);
    if (!targetElement) {
      return false;
    }

    // Use temporary element approach for all requests (both one-time and subscriptions)
    // Let Lit's context system handle subscription lifecycle properly
    const tempElement = document.createElement("div");
    targetElement.appendChild(tempElement);

    try {
      const newEvent = new ContextEvent(
        contextEvent.context,
        // @ts-expect-error (this fails a typecheck but works)
        contextEvent.callback,
        contextEvent.subscribe,
      );

      tempElement.dispatchEvent(newEvent);
      return true;
    } finally {
      targetElement.removeChild(tempElement);
    }
  }
}
