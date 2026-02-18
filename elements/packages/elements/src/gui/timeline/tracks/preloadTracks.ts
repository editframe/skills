/**
 * This module pre-loads all track components to ensure they're registered before use.
 *
 * CRITICAL: This module MUST be imported before any code that:
 * - Uses track components (ef-audio-track, ef-video-track, etc.)
 * - Uses renderTrackChildren (which renders track custom elements)
 * - Dynamically imports sandbox files that use track components
 *
 * The import order is critical:
 * 1. TrackItem must be fully initialized first
 * 2. Then all track components can safely extend TrackItem
 * 3. All custom elements are registered
 */

// CRITICAL: Import TrackItem initialization FIRST
import "./ensureTrackItemInit.js";

// Now import all track components - they can safely extend TrackItem since it's already initialized
// This includes ALL track components that were previously imported by renderTrackChildren
import "./AudioTrack.js";
import "./VideoTrack.js";
import "./ImageTrack.js";
import "./TimegroupTrack.js";
import "./TextTrack.js";
import "./HTMLTrack.js";
import "./CaptionsTrack.js";
import "./WaveformTrack.js";

// Export nothing - this is just for side effects
export {};
