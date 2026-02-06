import { type Context, consume } from "@lit/context";
import type { LitElement } from "lit";
import { property, state } from "lit/decorators.js";
import { isEFTemporal } from "../elements/EFTemporal.js";
import { TargetController } from "../elements/TargetController.js";
import { type ControllableInterface, isControllable } from "./Controllable.js";
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

    #subscribeToTargetContext() {
      if (!this.targetElement) return;

      this.#contextUnsubscribe?.();

      // Unsubscribe from all additional contexts
      for (const unsubscribe of this.#additionalContextUnsubscribes.values()) {
        unsubscribe();
      }
      this.#additionalContextUnsubscribes.clear();

      // Subscribe to efContext
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

      // Subscribe to additional contexts that controls commonly need
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
            // Update the control's property if it exists
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
          !controllable
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
      this.#contextUnsubscribe?.();
      for (const unsubscribe of this.#additionalContextUnsubscribes.values()) {
        unsubscribe();
      }
      this.#additionalContextUnsubscribes.clear();
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
