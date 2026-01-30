import type { EFTimegroup } from "../elements/EFTimegroup.js";
import type { 
  TimePointImportance, 
  ThumbnailAddress,
  CaptureOptions,
  ViewportState
} from "./types.js";
import { ContentVersionTracker } from "./ContentVersionTracker.js";
import { ViewportOracle } from "./ViewportOracle.js";
import { ThumbnailCache } from "./ThumbnailCache.js";
import { ThumbnailGenerator } from "./ThumbnailGenerator.js";
import { EventEmitter } from "./EventEmitter.js";

/**
 * Thumbnail Coordinator
 * 
 * Responsibilities:
 * - Orchestrate the thumbnail system
 * - Connect: viewport → importance → missing → generate → store
 * - Handle content version changes
 * - Manage update strategy
 * 
 * This is the ONLY place that knows about all components
 */
export class ThumbnailCoordinator extends EventEmitter<{
  "update-started": { element: EFTimegroup; count: number };
  "update-completed": { element: EFTimegroup; generated: number };
  "thumbnails-ready": { element: EFTimegroup };
}> {
  #versionTracker: ContentVersionTracker;
  #viewport: ViewportOracle;
  #cache: ThumbnailCache;
  #generator: ThumbnailGenerator;
  
  // Track if we've ever loaded thumbnails (for "ready" event)
  #hasLoaded = new WeakSet<EFTimegroup>();
  
  // Default capture options
  #captureOptions: CaptureOptions = {
    scale: 0.25,
    maxWidth: 480,
    contentReadyMode: "immediate",
  };

  constructor(options?: {
    versionTracker?: ContentVersionTracker;
    viewport?: ViewportOracle;
    cache?: ThumbnailCache;
    generator?: ThumbnailGenerator;
  }) {
    super();
    
    // Use provided or create new components
    this.#versionTracker = options?.versionTracker ?? new ContentVersionTracker();
    this.#viewport = options?.viewport ?? new ViewportOracle();
    this.#cache = options?.cache ?? new ThumbnailCache();
    this.#generator = options?.generator ?? new ThumbnailGenerator();
    
    // Set up cross-component reactions
    this.#setupReactions();
  }

  /**
   * Start coordinating thumbnails for an element
   */
  startTracking(element: EFTimegroup): void {
    this.#versionTracker.startTracking(element);
  }

  /**
   * Stop coordinating thumbnails for an element
   */
  stopTracking(element: EFTimegroup): void {
    this.#versionTracker.stopTracking(element);
  }

  /**
   * Main update loop: Query → Generate → Store
   * Takes exact addresses to generate (display component decides what's needed)
   */
  async updateAddresses(
    element: EFTimegroup,
    requestedAddresses: ThumbnailAddress[]
  ): Promise<void> {
    console.log(`[ThumbnailCoordinator] updateAddresses() called with ${requestedAddresses.length} addresses`);

    if (requestedAddresses.length === 0) {
      console.log(`[ThumbnailCoordinator] No addresses requested, exiting`);
      return;
    }

    // Get current content version
    const contentVersion = this.#versionTracker.currentVersion(element);
    console.log(`[ThumbnailCoordinator] Content version:`, contentVersion.version);
    
    // Update addresses with current version
    const addresses = requestedAddresses.map(addr => ({
      ...addr,
      contentVersion: contentVersion.version,
    }));
    
    // Query what's missing
    const missing = this.#cache.filterMissing(addresses);
    
    console.log(`[ThumbnailCoordinator] ${missing.length} missing thumbnails out of ${addresses.length}`);
    
    if (missing.length === 0) {
      // All thumbnails available
      console.log(`[ThumbnailCoordinator] All thumbnails available`);
      if (!this.#hasLoaded.has(element)) {
        this.#hasLoaded.add(element);
        this.emit("thumbnails-ready", { element });
      }
      return;
    }
    
    // Sort by time (for efficient sequential video seeking)
    const sortedMissing = [...missing].sort((a, b) => a.timeMs - b.timeMs);
    
    // 6. Mark as generating to avoid duplicate work
    for (const addr of sortedMissing) {
      this.#cache.markGenerating(addr);
    }
    
    console.log(`[ThumbnailCoordinator] Starting generation for ${sortedMissing.length} thumbnails`);
    
    this.emit("update-started", { 
      element, 
      count: sortedMissing.length 
    });
    
    // 7. MECHANISM: Generate thumbnails
    const times = sortedMissing.map(addr => addr.timeMs);
    let generatedCount = 0;
    
    try {
      for await (const result of this.#generator.generateBatch(
        element, 
        times, 
        this.#captureOptions
      )) {
        // Update address with correct version
        const address: ThumbnailAddress = {
          ...result.address,
          elementId: element.id || "unknown",
          contentVersion: contentVersion.version,
        };
        
        console.log(`[ThumbnailCoordinator] Generated thumbnail at ${address.timeMs}ms`);
        
        // 8. MECHANISM: Store in cache
        this.#cache.store(address, result.data, result.metadata);
        generatedCount++;
        
        console.log(`[ThumbnailCoordinator] Stored in cache, total generated: ${generatedCount}/${times.length}`);
      }
    } catch (error) {
      console.error("[ThumbnailCoordinator] Generation failed:", error);
    }
    
    console.log(`[ThumbnailCoordinator] Generation complete: ${generatedCount}/${times.length} thumbnails`);
    
    this.emit("update-completed", { element, generated: generatedCount });
    
    // First load complete?
    if (!this.#hasLoaded.has(element) && generatedCount > 0) {
      this.#hasLoaded.add(element);
      this.emit("thumbnails-ready", { element });
    }
  }

  /**
   * Get reference to components (for advanced usage)
   */
  get components() {
    return {
      versionTracker: this.#versionTracker,
      viewport: this.#viewport,
      cache: this.#cache,
      generator: this.#generator,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private Implementation
  // ─────────────────────────────────────────────────────────────────────────

  #setupReactions(): void {
    // React to content version changes
    this.#versionTracker.on("version-changed", ({ element, newVersion, reason }) => {
      // Invalidate old thumbnails
      const invalidated = this.#cache.invalidateOldVersions(
        element.id || "unknown",
        newVersion.version
      );
      
      if (invalidated > 0) {
        console.log(
          `[ThumbnailCoordinator] Content changed (${reason.type}), invalidated ${invalidated} thumbnails`
        );
      }
      
      // Dispose generator's clone (will be recreated on next capture)
      this.#generator.disposeClone();
    });
  }
}
