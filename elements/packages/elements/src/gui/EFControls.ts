import { type Context, createContext, provide } from "@lit/context";
import { css, LitElement, type PropertyValueMap } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { attachContextRoot } from "../attachContextRoot.js";
import { isEFTemporal, type TemporalMixinInterface } from "../elements/EFTemporal.js";
import { TargetController } from "../elements/TargetController.js";
import { targetTemporalContext } from "./ContextMixin.js";
import {
  type ControllableInterface,
  type ControllableSubscription,
  createDirectTemporalSubscription,
  determineTargetType,
} from "./Controllable.js";
import { currentTimeContext } from "./currentTimeContext.js";
import { durationContext } from "./durationContext.js";
import { efContext } from "./efContext.js";
import { type FocusContext, focusContext } from "./focusContext.js";
import { focusedElementContext } from "./focusedElementContext.js";
import { loopContext, playingContext } from "./playingContext.js";

attachContextRoot();

class ContextRequestEvent extends Event {
  context: Context<any, any>;
  contextTarget: Element;
  callback: (proxy: EFControls, value: any) => void;
  subscribe: boolean;

  constructor(
    context: Context<any, any>,
    contextTarget: Element,
    callback: (proxy: EFControls, value: any) => void,
    subscribe: boolean,
  ) {
    super("context-request", { bubbles: true, composed: true });
    this.context = context;
    this.contextTarget = contextTarget;
    this.callback = callback;
    this.subscribe = subscribe ?? false;
  }
}

const proxiedContexts = [
  [
    // biome-ignore lint/suspicious/noAssignInExpressions: Intentional assignment in callback
    (proxy: EFControls, value: boolean) => (proxy.playing = value),
    playingContext,
  ],
  [
    // biome-ignore lint/suspicious/noAssignInExpressions: Intentional assignment in callback
    (proxy: EFControls, value: boolean) => (proxy.loop = value),
    loopContext,
  ],
  [
    // biome-ignore lint/suspicious/noAssignInExpressions: Intentional assignment in callback
    (proxy: EFControls, value: number) => (proxy.currentTimeMs = value),
    currentTimeContext,
  ],
  [
    // biome-ignore lint/suspicious/noAssignInExpressions: Intentional assignment in callback
    (proxy: EFControls, value: number) => (proxy.durationMs = value),
    durationContext,
  ],
  [
    (proxy: EFControls, value: TemporalMixinInterface) =>
      // biome-ignore lint/suspicious/noAssignInExpressions: Intentional assignment in callback
      (proxy.targetTemporal = value),
    targetTemporalContext,
  ],
  [
    // biome-ignore lint/suspicious/noAssignInExpressions: Intentional assignment in callback
    (proxy: EFControls, value: HTMLElement) => (proxy.focusedElement = value),
    focusedElementContext,
  ],
  [
    (proxy: EFControls, value: HTMLElement) =>
      // biome-ignore lint/suspicious/noAssignInExpressions: Intentional assignment in callback
      (proxy.focusContext.focusedElement = value),
    focusContext,
  ],
] as const;

export const testContext = createContext<string | null>("test");

/**
 * EFControls provides a way to control an ef-preview element that is not a direct ancestor.
 * It bridges the contexts from a target preview element to its children controls.
 *
 * Usage:
 * ```html
 * <ef-preview id="my-preview">...</ef-preview>
 *
 * <ef-controls target="my-preview">
 *   <ef-toggle-play>
 *     <button slot="play">Play</button>
 *     <button slot="pause">Pause</button>
 *   </ef-toggle-play>
 *   <ef-scrubber></ef-scrubber>
 *   <ef-time-display></ef-time-display>
 * </ef-controls>
 * ```
 */
@customElement("ef-controls")
export class EFControls extends LitElement {
  static styles = css`
    :host {
      display: block;
    }
  `;

  createRenderRoot() {
    return this;
  }

  /**
   * The ID of the ef-preview element to control
   */
  @property({ type: String })
  target = "";

  /**
   * The target element (set by TargetController)
   */
  @provide({ context: efContext })
  @state()
  targetElement: ControllableInterface | null = null;

  @provide({ context: playingContext })
  @state()
  playing = false;

  @provide({ context: loopContext })
  @state()
  loop = false;

  @provide({ context: currentTimeContext })
  @state()
  currentTimeMs = 0;

  @provide({ context: durationContext })
  @state()
  durationMs = 0;

  @provide({ context: targetTemporalContext })
  @state()
  targetTemporal: TemporalMixinInterface | null = null;

  @provide({ context: focusedElementContext })
  @state()
  focusedElement?: HTMLElement;

  @provide({ context: focusContext })
  focusContext = this as FocusContext;

  // @ts-expect-error controller is intentionally not referenced directly
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: Used for side effects
  #targetController = new TargetController(this);

  // Subscription tracking for different target types
  #contextUnsubscribeMap = new Map<Context<any, any>, () => void>();
  #directTemporalSubscription: ControllableSubscription | null = null;

  #unsubscribe() {
    // Abort any pending async subscription attempts
    this.#subscribeAbortController?.abort();
    this.#subscribeAbortController = null;

    // Unsubscribe from context-provider subscriptions
    for (const unsubscribe of this.#contextUnsubscribeMap.values()) {
      unsubscribe();
    }
    this.#contextUnsubscribeMap.clear();

    // Unsubscribe from direct-temporal subscription
    if (this.#directTemporalSubscription) {
      this.#directTemporalSubscription.unsubscribe();
      this.#directTemporalSubscription = null;
    }

    // Note: We don't reset state here because:
    // 1. During resubscribe, the new subscription will immediately provide values
    // 2. During disconnect, the element is being removed anyway
    // Resetting state would cause race conditions with context consumers
  }

  #subscribeAbortController: AbortController | null = null;

  #subscribe() {
    if (!this.targetElement) return;

    // Cancel any pending async subscription
    this.#subscribeAbortController?.abort();
    this.#subscribeAbortController = new AbortController();

    const targetType = determineTargetType(this.targetElement);

    switch (targetType) {
      case "context-provider":
        this.#subscribeToContextProvider();
        break;
      case "direct-temporal":
        this.#subscribeToDirectTemporal();
        break;
      case "none":
        // Target might be a temporal that hasn't initialized yet
        // Try to wait for it to become controllable
        this.#waitForTemporalToInitialize();
        break;
    }
  }

  /**
   * Wait for a temporal element to initialize its playbackController.
   * This handles the case where we target a temporal element before it has
   * completed initialization and created its playbackController.
   */
  async #waitForTemporalToInitialize() {
    if (!this.targetElement || !isEFTemporal(this.targetElement)) return;

    const temporal = this.targetElement as TemporalMixinInterface & HTMLElement;
    const signal = this.#subscribeAbortController?.signal;

    // Wait for the element to finish its update cycle
    await temporal.updateComplete;
    if (signal?.aborted) return;

    // Check again if it now has a playbackController
    if (temporal.playbackController) {
      this.#subscribeToDirectTemporal();
    }
  }

  /**
   * Subscribe to a context-providing target (like EFPreview).
   * Uses Lit Context dispatch mechanism.
   */
  #subscribeToContextProvider() {
    if (!this.targetElement) return;

    for (const [callback, context] of proxiedContexts) {
      const event = new ContextRequestEvent(
        context,
        this,
        (value, unsubscribe) => {
          callback(this, value as never);
          this.#contextUnsubscribeMap.set(context, unsubscribe);
        },
        true,
      );
      this.targetElement.dispatchEvent(event);
    }
  }

  /**
   * Subscribe to a direct temporal element's playback controller.
   * Used when targeting ef-timegroup, ef-video, ef-audio directly without ef-preview wrapper.
   */
  async #subscribeToDirectTemporal() {
    if (!this.targetElement || !isEFTemporal(this.targetElement)) return;

    const temporal = this.targetElement as TemporalMixinInterface & HTMLElement;
    const signal = this.#subscribeAbortController?.signal;

    // Wait for the temporal element to complete initialization
    // This ensures playbackController exists
    await temporal.updateComplete;
    if (signal?.aborted) return;

    // If playbackController still doesn't exist, the element might need another update cycle
    if (!temporal.playbackController) {
      // Wait one more frame for didBecomeRoot to create the controller
      await new Promise((resolve) => requestAnimationFrame(resolve));
      if (signal?.aborted) return;
      await temporal.updateComplete;
      if (signal?.aborted) return;
    }

    if (!temporal.playbackController) {
      // Still no controller - this element is likely a nested temporal
      return;
    }

    this.#directTemporalSubscription = createDirectTemporalSubscription(
      temporal,
      {
        onPlayingChange: (value) => {
          this.playing = value;
        },
        onLoopChange: (value) => {
          this.loop = value;
        },
        onCurrentTimeMsChange: (value) => {
          this.currentTimeMs = value;
        },
        onDurationMsChange: (value) => {
          this.durationMs = value;
        },
        onTargetTemporalChange: (value) => {
          this.targetTemporal = value;
        },
        onFocusedElementChange: (value) => {
          this.focusedElement = value;
        },
      },
    );
  }

  #resubscribe() {
    this.#unsubscribe();
    this.#subscribe();
  }
  updated(changedProperties: PropertyValueMap<this>) {
    super.updated(changedProperties);
    if (changedProperties.has("targetElement")) {
      this.#resubscribe();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.#unsubscribe();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ef-controls": EFControls;
  }
}
