import type { ContentVersion, VersionChangeReason } from "./types.js";
import type { EFTimegroup } from "../elements/EFTimegroup.js";
import { EventEmitter } from "./EventEmitter.js";

/**
 * Content Version Tracking
 * 
 * Responsibilities:
 * - Track when visual content changes
 * - Increment version on relevant changes
 * - Provide version comparison
 * - Emit events on version changes
 * 
 * Does NOT know about:
 * - Thumbnails
 * - Cache
 * - Viewport
 * - Display
 */
export class ContentVersionTracker extends EventEmitter<{
  "version-changed": { 
    element: EFTimegroup; 
    oldVersion: ContentVersion; 
    newVersion: ContentVersion;
    reason: VersionChangeReason;
  }
}> {
  // Track versions per element
  #versions = new Map<string, ContentVersion>();
  
  // Track active observers per element
  #observers = new Map<string, MutationObserver>();
  
  // Track media loading watchers per element (currently unused - see startTracking)
  #mediaWatchers = new Map<string, Set<() => void>>();

  /**
   * Get current content version for an element
   */
  currentVersion(element: EFTimegroup): ContentVersion {
    const id = this.#getElementId(element);
    
    if (!this.#versions.has(id)) {
      // Initialize version for this element
      const version: ContentVersion = {
        version: 0,
        timestamp: Date.now(),
        elementId: id,
      };
      this.#versions.set(id, version);
    }
    
    return this.#versions.get(id)!;
  }

  /**
   * Start tracking content changes for an element
   */
  startTracking(element: EFTimegroup): void {
    const id = this.#getElementId(element);
    
    // Already tracking?
    if (this.#observers.has(id)) return;
    
    // Set up mutation observer
    const observer = new MutationObserver((mutations) => {
      this.#handleMutations(element, mutations);
    });
    
    observer.observe(element, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["src", "asset-id", "style", "transform"],
    });
    
    this.#observers.set(id, observer);
    
    // NOTE: Disabled media loading watching for now - it causes version churn during initial page load
    // when all media is loading simultaneously. MutationObserver will catch content changes.
    // TODO: Re-enable after first thumbnail load completes
    // this.#watchMediaLoading(element);
    
    // Watch for duration becoming available
    this.#watchDuration(element);
  }

  /**
   * Stop tracking an element
   */
  stopTracking(element: EFTimegroup): void {
    const id = this.#getElementId(element);
    
    this.#observers.get(id)?.disconnect();
    this.#observers.delete(id);
    
    // Clean up media watchers
    const watchers = this.#mediaWatchers.get(id);
    if (watchers) {
      for (const cleanup of watchers) cleanup();
      this.#mediaWatchers.delete(id);
    }
  }

  /**
   * Manually increment version (for external triggers)
   */
  incrementVersion(
    element: EFTimegroup, 
    reason: VersionChangeReason
  ): ContentVersion {
    const id = this.#getElementId(element);
    const oldVersion = this.currentVersion(element);
    
    const newVersion: ContentVersion = {
      version: oldVersion.version + 1,
      timestamp: Date.now(),
      elementId: id,
    };
    
    this.#versions.set(id, newVersion);
    
    this.emit("version-changed", {
      element,
      oldVersion,
      newVersion,
      reason,
    });
    
    return newVersion;
  }

  /**
   * Check if content has changed since a specific version
   */
  hasChangedSince(element: EFTimegroup, since: ContentVersion): boolean {
    const current = this.currentVersion(element);
    return current.version > since.version;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private Implementation
  // ─────────────────────────────────────────────────────────────────────────

  #getElementId(element: EFTimegroup): string {
    // Use element id if available, otherwise generate stable id
    if (element.id) return element.id;
    
    // Generate id based on position in DOM tree
    let path = "";
    let el: Element | null = element;
    while (el && el.parentElement) {
      const siblings = Array.from(el.parentElement.children);
      const index = siblings.indexOf(el);
      path = `${index}/${path}`;
      el = el.parentElement;
    }
    
    return `tg-${path}`;
  }

  #handleMutations(element: EFTimegroup, mutations: MutationRecord[]): void {
    // Filter to only visual content changes
    const hasVisualChange = mutations.some(m => {
      if (m.type === "childList") return true; // Child added/removed
      if (m.type === "attributes") {
        const attr = m.attributeName;
        return attr === "src" || attr === "asset-id" || 
               attr === "style" || attr === "transform";
      }
      return false;
    });
    
    if (!hasVisualChange) return;
    
    // Collect affected attributes for debugging
    const attributes = mutations
      .filter(m => m.type === "attributes")
      .map(m => m.attributeName!)
      .filter((v, i, a) => a.indexOf(v) === i); // unique
    
    this.incrementVersion(element, {
      type: "dom_mutation",
      attributes,
    });
  }

  #watchMediaLoading(element: EFTimegroup): void {
    const id = this.#getElementId(element);
    const cleanupFns = new Set<() => void>();
    
    const mediaElements = element.querySelectorAll("ef-video, ef-image, ef-audio");
    
    for (const mediaEl of mediaElements) {
      const watchMedia = async () => {
        try {
          // Watch for media engine task completion
          const task = (mediaEl as any).mediaEngineTask || (mediaEl as any).fetchImage;
          if (task?.taskComplete) {
            await task.taskComplete;
            
            // Check element still tracked
            if (this.#observers.has(id)) {
              this.incrementVersion(element, {
                type: "media_loaded",
                mediaId: (mediaEl as any).id || mediaEl.tagName,
              });
            }
          }
        } catch {
          // Ignore aborts
        }
      };
      
      watchMedia();
    }
    
    this.#mediaWatchers.set(id, cleanupFns);
  }

  #watchDuration(element: EFTimegroup): void {
    if (element.durationMs > 0) return; // Already has duration
    
    const checkDuration = () => {
      if (!this.#observers.has(this.#getElementId(element))) return;
      
      if (element.durationMs > 0) {
        this.incrementVersion(element, {
          type: "manual",
          reason: "duration-available",
        });
      } else {
        requestAnimationFrame(checkDuration);
      }
    };
    
    requestAnimationFrame(checkDuration);
  }
}
