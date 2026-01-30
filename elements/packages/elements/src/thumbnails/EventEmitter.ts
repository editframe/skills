/**
 * Simple type-safe event emitter
 */
export class EventEmitter<Events extends Record<string, any>> {
  #listeners = new Map<keyof Events, Set<(data: any) => void>>();

  on<K extends keyof Events>(event: K, listener: (data: Events[K]) => void): () => void {
    if (!this.#listeners.has(event)) {
      this.#listeners.set(event, new Set());
    }
    
    this.#listeners.get(event)!.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.#listeners.get(event)?.delete(listener);
    };
  }

  emit<K extends keyof Events>(event: K, data: Events[K]): void {
    const listeners = this.#listeners.get(event);
    if (listeners) {
      for (const listener of listeners) {
        listener(data);
      }
    }
  }

  removeAllListeners(event?: keyof Events): void {
    if (event) {
      this.#listeners.delete(event);
    } else {
      this.#listeners.clear();
    }
  }
}
