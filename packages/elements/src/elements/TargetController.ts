import { LitElement, type ReactiveController } from "lit";

type Constructor<T = {}> = new (...args: any[]) => T;

// Symbol to identify elements that can be targeted
const EF_TARGETABLE = Symbol("EF_TARGETABLE");

class TargetRegistry {
  private idMap = new Map<string, LitElement>();
  private callbacks = new Map<
    string,
    Set<(target: LitElement | undefined) => void>
  >();

  subscribe(id: string, callback: (target: LitElement | undefined) => void) {
    this.callbacks.set(id, this.callbacks.get(id) ?? new Set());
    this.callbacks.get(id)?.add(callback);
  }

  unsubscribe(
    id: string | null,
    callback: (target: LitElement | undefined) => void,
  ) {
    if (id === null) {
      return;
    }
    this.callbacks.get(id)?.delete(callback);
    if (this.callbacks.get(id)?.size === 0) {
      this.callbacks.delete(id);
    }
  }

  get(id: string) {
    return this.idMap.get(id);
  }

  register(id: string, target: LitElement) {
    this.idMap.set(id, target);
    for (const callback of this.callbacks.get(id) ?? []) {
      callback(target);
    }
  }

  unregister(id: string, target: LitElement) {
    if (this.idMap.get(id) !== target) {
      // Avoid unregistering a target that is not the current target
      return;
    }
    for (const callback of this.callbacks.get(id) ?? []) {
      callback(undefined);
    }
    this.idMap.delete(id);
    this.callbacks.delete(id);
  }
}

// Map of root nodes to their target registries
const documentRegistries = new WeakMap<Node, TargetRegistry>();

const getRegistry = (root: Node) => {
  let registry = documentRegistries.get(root);
  if (!registry) {
    registry = new TargetRegistry();
    documentRegistries.set(root, registry);
  }
  return registry;
};

export declare class TargetableMixinInterface {
  id: string;
}

export const isEFTargetable = (obj: any): obj is TargetableMixinInterface =>
  obj[EF_TARGETABLE];

export const EFTargetable = <T extends Constructor<LitElement>>(
  superClass: T,
) => {
  class TargetableElement extends superClass {
    #registry: TargetRegistry | null = null;

    static get observedAttributes(): string[] {
      // Get parent's observed attributes
      const parentAttributes = (superClass as any).observedAttributes || [];
      // Add 'id' if not already present
      return [...new Set([...parentAttributes, "id"])];
    }

    private updateRegistry(oldValue: string, newValue: string) {
      if (!this.#registry) return;
      if (oldValue === newValue) return;

      if (oldValue) {
        this.#registry.unregister(oldValue, this);
      }
      if (newValue) {
        this.#registry.register(newValue, this);
      }
    }

    connectedCallback() {
      super.connectedCallback();
      this.#registry = getRegistry(this.getRootNode());
      const initialId = this.getAttribute("id");
      if (initialId) {
        this.updateRegistry("", initialId);
      }
    }

    attributeChangedCallback(
      name: string,
      old: string | null,
      value: string | null,
    ) {
      super.attributeChangedCallback(name, old, value);
      if (name === "id") {
        this.updateRegistry(old ?? "", value ?? "");
      }
    }

    disconnectedCallback() {
      if (this.#registry) {
        this.updateRegistry(this.id, "");
        this.#registry = null;
      }
      super.disconnectedCallback();
    }
  }

  Object.defineProperty(TargetableElement.prototype, EF_TARGETABLE, {
    value: true,
  });

  return TargetableElement as T;
};

class TargetUpdateController implements ReactiveController {
  constructor(private host: LitElement) {}

  hostConnected() {
    this.host.requestUpdate();
  }

  hostDisconnected() {
    this.host.requestUpdate();
  }

  hostUpdate() {
    this.host.requestUpdate();
  }
}

export class TargetController implements ReactiveController {
  private host: LitElement & { targetElement: Element | null; target: string };
  private targetController: ReactiveController | null = null;
  private currentTargetString: string | null = null;

  constructor(
    host: LitElement & { targetElement: Element | null; target: string },
  ) {
    this.host = host;
    this.host.addController(this);
    this.currentTargetString = this.host.target;
    if (this.currentTargetString) {
      this.registry.subscribe(this.currentTargetString, this.registryCallback);
    }
  }

  private registryCallback = (target: LitElement | undefined) => {
    this.host.targetElement = target ?? null;
  };

  private updateTarget() {
    const newTarget = this.registry.get(this.host.target);
    if (this.host.targetElement !== newTarget) {
      this.disconnectFromTarget();
      this.host.targetElement = newTarget ?? (null as Element | null);
      this.connectToTarget();
      this.host.requestUpdate("targetElement");
    }
  }

  private connectToTarget() {
    if (this.host.targetElement instanceof LitElement) {
      this.targetController = new TargetUpdateController(this.host);
      this.host.targetElement.addController(this.targetController);
    }
  }

  private disconnectFromTarget() {
    if (
      this.host.targetElement instanceof LitElement &&
      this.targetController
    ) {
      this.host.targetElement.removeController(this.targetController);
      this.targetController = null;
    }
  }

  private get registry() {
    const root = this.host.getRootNode();
    return getRegistry(root);
  }

  hostDisconnected() {
    this.disconnectFromTarget();
  }

  hostConnected() {
    this.updateTarget();
  }

  hostUpdate() {
    if (this.currentTargetString !== this.host.target) {
      this.registry.unsubscribe(
        this.currentTargetString,
        this.registryCallback,
      );
      this.registry.subscribe(this.host.target, this.registryCallback);
      this.updateTarget();
      this.currentTargetString = this.host.target;
    }
  }
}
