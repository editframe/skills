/**
 * Thumbnail System Types
 * 
 * Core type definitions for the thumbnail generation and caching system.
 * These types are shared across all components of the system.
 */

// ============================================================================
// CONTENT VERSIONING
// ============================================================================

/**
 * Identifies a specific version of content.
 * Content version changes when visual output would differ.
 */
export interface ContentVersion {
  /** Unique identifier for this version (increment on change) */
  readonly version: number;
  
  /** When this version was created */
  readonly timestamp: number;
  
  /** What element this version is for */
  readonly elementId: string;
  
  /** Optional: Granular time range affected (for partial invalidation) */
  readonly affectedRange?: [startMs: number, endMs: number];
}

/**
 * Reasons why content version changed (for debugging)
 */
export type VersionChangeReason = 
  | { type: "dom_mutation"; attributes: string[] }
  | { type: "media_loaded"; mediaId: string }
  | { type: "child_added"; childId: string }
  | { type: "manual"; reason: string };

// ============================================================================
// VIEWPORT & IMPORTANCE
// ============================================================================

/**
 * Current viewport state (all the info needed to determine importance)
 */
export interface ViewportState {
  /** Left edge of viewport in pixels */
  readonly scrollLeft: number;
  
  /** Width of visible area in pixels */
  readonly viewportWidth: number;
  
  /** Pixels per millisecond (zoom level) */
  readonly pixelsPerMs: number;
  
  /** Optional: User interaction state for predictive importance */
  readonly interaction?: {
    readonly type: "scrolling" | "zooming" | "idle";
    readonly velocity?: number; // px/s for scrolling
  };
}

/**
 * Importance of a specific time point
 */
export interface TimePointImportance {
  readonly timeMs: number;
  readonly priority: Priority;
  readonly reason: ImportanceReason;
  
  /** For sorting: higher score = more important */
  readonly score: number;
}

export type Priority = 
  | "critical"  // Currently visible, must render immediately
  | "high"      // Just outside viewport, preload for smooth scrolling
  | "low"       // Far from viewport but within render distance
  | "none";     // Outside render distance, don't load

export type ImportanceReason =
  | "visible"       // In current viewport
  | "ahead"         // Right of viewport (user likely scrolling forward)
  | "behind"        // Left of viewport (user might scroll back)
  | "predicted"     // ML/heuristic prediction of next viewport
  | "preload";      // General preloading strategy

/**
 * Snapshot of viewport state for change detection
 */
export interface ViewportSnapshot {
  readonly timestamp: number;
  readonly state: ViewportState;
  readonly hash: string; // Quick comparison
}

// ============================================================================
// THUMBNAIL ADDRESSING & AVAILABILITY
// ============================================================================

/**
 * Uniquely identifies a specific thumbnail
 * This is the "primary key" for the thumbnail cache
 */
export interface ThumbnailAddress {
  /** Element being thumbnailed */
  readonly elementId: string;
  
  /** Content version (for cache invalidation) */
  readonly contentVersion: number;
  
  /** Timestamp in the element */
  readonly timeMs: number;
  
  /** Optional: Quality level for multi-quality support */
  readonly quality?: "low" | "medium" | "high";
}

/**
 * Current status and data for a thumbnail
 */
export interface ThumbnailAvailability {
  readonly address: ThumbnailAddress;
  readonly status: ThumbnailStatus;
  readonly data?: ImageData;
  readonly metadata?: ThumbnailMetadata;
}

export type ThumbnailStatus =
  | "available"   // Ready to display
  | "generating"  // Currently being captured
  | "failed"      // Generation failed
  | "missing";    // Not yet attempted

export interface ThumbnailMetadata {
  readonly generatedAt: number;
  readonly width: number;
  readonly height: number;
  readonly generationTimeMs?: number;
}

// ============================================================================
// GENERATION
// ============================================================================

export interface CaptureOptions {
  readonly scale: number;
  readonly maxWidth: number;
  readonly contentReadyMode: "immediate" | "blocking";
  readonly blockingTimeoutMs?: number;
}

export interface GenerationResult {
  readonly address: ThumbnailAddress;
  readonly data: ImageData;
  readonly metadata: ThumbnailMetadata;
}

export interface GenerationProgress {
  readonly completed: number;
  readonly total: number;
  readonly currentAddress?: ThumbnailAddress;
}
