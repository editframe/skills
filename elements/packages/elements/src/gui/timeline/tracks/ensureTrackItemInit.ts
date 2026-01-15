/**
 * This module ensures TrackItem is fully initialized before track components extend it.
 * 
 * CRITICAL: This module must be imported BEFORE any track components (AudioTrack, etc.)
 * to ensure TrackItem is fully evaluated before any class tries to extend it.
 */

// Import TrackItem - this ensures the module is fully evaluated
import { TrackItem } from "./TrackItem.js";

// Re-export for convenience
export { TrackItem };
