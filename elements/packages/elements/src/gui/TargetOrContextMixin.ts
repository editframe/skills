import { type Context, consume } from "@lit/context";
import type { LitElement } from "lit";
import { property, state } from "lit/decorators.js";
import { isEFTemporal, type TemporalMixinInterface } from "../elements/EFTemporal.js";
import { TargetController } from "../elements/TargetController.js";
import {
  type ControllableInterface,
  type ControllableSubscription,
  isControllable,
  determineTargetType,
  createDirectTemporalSubscription,
} from "./Controllable.js";
import { currentTimeContext } from "./currentTimeContext.js";
import { durationContext } from "./durationContext.js";
import { loopContext, playingContext } from "./playingContext.js";

type Constructor<T = {}> = new (...args: any[]) => T;

class ContextRequestEvent extends Event {
  context: Context<any, any>;
  contextTarget: Element;
  callback: (value: any, unsubscribe: () => void) => void;
  subscribe: boolean;

  constructor(
    context: Context<any, any>,
    contextTarget: Element,
    callback: (value: any, unsubscribe: () => void) => void,
    subscribe: boolean,
  ) {
    super("context-request", { bubbles: true, composed: true });
    this.context = context;
    this.contextTarget = contextTarget;
    this.callback = callback;
    this.subscribe = subscribe ?? false;
  }
}

export function TargetOrContextMixin<T extends Constructor<LitElement>>(
  superClass: T,
  contextToProxy: Context<any, any>,
) {
  class TargetOrContextClass extends superClass {
    @property({ type: String })
    target = "";

    @state()
    targetElement: ControllableInterface | null = null;

    // @ts-expect-error contextToProxy is generic but provides ControllableInterface at runtime
    @consume({ context: contextToProxy, subscribe: true })
    contextFromParent: ControllableInterface | null = null;

    #targetController?: TargetController;
    #contextUnsubscribe?: () => void;
    #contextRequestHandler?: (event: Event) => void;
    #additionalContextUnsubscribes = new Map<Context<any, any>, () => void>();
    #directTemporalSubscription?: ControllableSubscription;

    get effectiveContext(): ControllableInterface | null {
      return this.targetElement ?? this.contextFromParent;
    }

    connectedCallback() {
      super.connectedCallback();
      if (this.target) {
        this.#targetController = new TargetController(
          this as any as LitElement & {
            targetElement: Element | null;
            target: string;
          },
        );
      }

      // Intercept context-request events and redirect them to targetElement
      this.#contextRequestHandler = (event: Event) => {
        if (this.targetElement && event.type === "context-request") {
          event.stopPropagation();
          this.targetElement.dispatchEvent(
            new (event.constructor as any)(event.type, event),
          );
        }
      };
      this.addEventListener(
        "context-request",
        this.#contextRequestHandler,
        true,
      );
    }

    #unsubscribeAll() {
      this.#contextUnsubscribe?.();
      this.#contextUnsubscribe = undefined;
      for (const unsubscribe of this.#additionalContextUnsubscribes.values()) {
        unsubscribe();
      }
      this.#additionalContextUnsubscribes.clear();
      this.#directTemporalSubscription?.unsubscribe();
      this.#directTemporalSubscription = undefined;
    }

    #tryDirectTemporalSubscription(): boolean {
      if (!this.targetElement) return false;

      const targetType = determineTargetType(this.targetElement);
      if (targetType !== "direct-temporal") return false;

      this.#directTemporalSubscription = createDirectTemporalSubscription(
        this.targetElement as unknown as TemporalMixinInterface & HTMLElement,
        {
          onPlayingChange: (value) => { (this as any).playing = value; },
          onLoopChange: (value) => { if ("loop" in this) (this as any).loop = value; },
          onCurrentTimeMsChange: (value) => { if ("currentTimeMs" in this) (this as any).currentTimeMs = value; },
          onDurationMsChange: (value) => { if ("durationMs" in this) (this as any).durationMs = value; },
          onTargetTemporalChange: () => {},
        },
      );
      return true;
    }

    #subscribeToTargetContext() {
      if (!this.targetElement) return;

      this.#unsubscribeAll();

      if (this.#tryDirectTemporalSubscription()) return;

      // Temporal target without PlaybackController yet — wait for initialization
      if (isEFTemporal(this.targetElement)) {
        const target = this.targetElement as unknown as TemporalMixinInterface & HTMLElement;
        target.updateComplete.then(() => {
          if ((this.targetElement as unknown) !== target) return;
          if (!this.#tryDirectTemporalSubscription()) {
            // Still not ready — one more cycle (PlaybackController created in updateComplete.then)
            target.updateComplete.then(() => {
              if ((this.targetElement as unknown) !== target) return;
              this.#tryDirectTemporalSubscription();
            });
          }
        });
        return;
      }

      // Context-provider path (EFPreview, etc.)
      const event = new ContextRequestEvent(
        contextToProxy,
        this,
        (value, unsubscribe) => {
          (this as any).contextFromParent = value;
          this.#contextUnsubscribe = unsubscribe;
        },
        true,
      );
      this.targetElement.dispatchEvent(event);

      const additionalContexts: Array<[Context<any, any>, string]> = [
        [playingContext, "playing"],
        [loopContext, "loop"],
        [currentTimeContext, "currentTimeMs"],
        [durationContext, "durationMs"],
      ];

      for (const [context, propertyName] of additionalContexts) {
        const contextEvent = new ContextRequestEvent(
          context,
          this,
          (value, unsubscribe) => {
            if (propertyName in this) {
              (this as any)[propertyName] = value;
            }
            this.#additionalContextUnsubscribes.set(context, unsubscribe);
          },
          true,
        );
        this.targetElement.dispatchEvent(contextEvent);
      }
    }

    updated(changedProperties: Map<string | number | symbol, unknown>): void {
      super.updated?.(changedProperties);

      if (changedProperties.has("targetElement") && this.targetElement) {
        if (
          isEFTemporal(this.targetElement) &&
          !isControllable(this.targetElement)
        ) {
          console.warn(
            "Control element is targeting a non-root temporal element without playbackController. " +
              "Controls can only target root temporal elements (not nested within a timegroup). " +
              "Target element:",
            this.targetElement,
          );
        }
        this.#subscribeToTargetContext();
      }

      if (changedProperties.has("target")) {
        if (this.target && !this.#targetController) {
          this.#targetController = new TargetController(
            this as any as LitElement & {
              targetElement: Element | null;
              target: string;
            },
          );
        }
      }
    }

    disconnectedCallback() {
      super.disconnectedCallback();
      this.#unsubscribeAll();
      if (this.#contextRequestHandler) {
        this.removeEventListener(
          "context-request",
          this.#contextRequestHandler,
          true,
        );
      }
    }
  }

  return TargetOrContextClass as Constructor<{
    target: string;
    targetElement: ControllableInterface | null;
    effectiveContext: ControllableInterface | null;
  }> &
    T;
}
