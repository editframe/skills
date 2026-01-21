import { type Context, createContext, provide } from "@lit/context";
import { css, LitElement, type PropertyValueMap } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { attachContextRoot } from "../attachContextRoot.js";
import type { TemporalMixinInterface } from "../elements/EFTemporal.js";
import { TargetController } from "../elements/TargetController.js";
import { targetTemporalContext } from "./ContextMixin.js";
import type { ControllableInterface } from "./Controllable.js";
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

  #proxyUnsubscribeMap = new Map<Context<any, any>, () => void>();

  #unsubscribe() {
    for (const unsubscribe of this.#proxyUnsubscribeMap.values()) {
      unsubscribe();
    }
    this.#proxyUnsubscribeMap.clear();
  }

  #subscribe() {
    if (!this.targetElement) return;
    for (const [callback, context] of proxiedContexts) {
      const event = new ContextRequestEvent(
        context,
        this,
        (value, unsubscribe) => {
          callback(this, value as never);
          this.#proxyUnsubscribeMap.set(context, unsubscribe);
        },
        true,
      );
      this.targetElement.dispatchEvent(event);
    }
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
