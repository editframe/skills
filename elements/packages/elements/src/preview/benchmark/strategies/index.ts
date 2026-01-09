/**
 * Strategy registry - all sync strategies in one place.
 */

import type { SyncStrategy } from "../types.js";
import { baselineStrategy } from "./baseline.js";
import { batchedReadsStrategy } from "./batchedReads.js";
import { displayNoneBatchStrategy } from "./displayNoneBatch.js";

/** Registry of all strategies for easy iteration */
export const strategies = new Map<string, SyncStrategy>();

// Register strategies in order of expected impact
strategies.set("baseline", baselineStrategy);
strategies.set("batchedReads", batchedReadsStrategy);
strategies.set("displayNoneBatch", displayNoneBatchStrategy);

// Re-export individual strategies for direct access
export { baselineStrategy } from "./baseline.js";
export { batchedReadsStrategy } from "./batchedReads.js";
export { displayNoneBatchStrategy } from "./displayNoneBatch.js";

// Note: stylesheetInjection is experimental and not included in the default registry
// because adopted stylesheets don't serialize into SVG foreignObject.
// It may work for the native drawElementImage path in the future.

