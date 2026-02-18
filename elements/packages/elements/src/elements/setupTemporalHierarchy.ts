/**
 * Manually wire up the temporal element hierarchy (parent/root timegroup references).
 *
 * ## Why this is needed
 *
 * Lit Context (`@provide`/`@consume`) relies on `context-request` DOM events. When a consumer
 * connects, it dispatches a `context-request` event that bubbles up to find a provider.
 *
 * **The problem:** When HTML is loaded via `loadURL()` (our rendering path), custom elements
 * connect in depth-first order - children BEFORE parents. This means:
 * 1. `ef-video` connects → dispatches `context-request` event
 * 2. `ef-timegroup` hasn't connected yet → no provider listening → event is lost
 * 3. `ef-timegroup` connects → creates provider → but too late
 *
 * DOM events are point-in-time; once missed, they're gone. There's no retroactive discovery.
 *
 * Without proper parent/root timegroup references:
 * - Child temporal elements can't compute their `ownCurrentTimeMs` (stays at 0)
 * - Video/audio elements can't seek to correct timestamps
 * - Nested timegroups can't calculate their start times correctly
 *
 * ## When to use
 *
 * Call this function after:
 * 1. All elements are connected to DOM (`connectedCallback` has fired)
 * 2. All custom elements have upgraded (`updateComplete` has resolved)
 * 3. Before any time-based operations (seeking, rendering)
 *
 * ## Implementation
 *
 * This function manually traverses the DOM tree and sets:
 * - `parentTimegroup`: The immediate parent timegroup (used for start time calculations)
 * - `rootTimegroup`: The root timegroup (used for ownCurrentTimeMs calculations)
 *
 * This replicates what Lit Context's `@provide`/`@consume` decorators would do if elements
 * connected in parent-first order (as happens with declarative HTML parsing).
 *
 * @param searchRoot - The root element to search within (typically document.body or ef-workbench)
 * @param rootTimegroup - The root timegroup element that should be the hierarchy root
 *
 * @example
 * ```typescript
 * const rootTimegroup = document.querySelector('ef-timegroup');
 * await rootTimegroup.updateComplete;
 * setupTemporalHierarchy(document.body, rootTimegroup);
 * await rootTimegroup.seekForRender(100); // Now all children can compute correct times
 * ```
 */
export function setupTemporalHierarchy(
  searchRoot: Element,
  rootTimegroup: any,
): void {
  const temporalSelectors =
    "ef-video, ef-audio, ef-image, ef-text, ef-waveform, ef-timegroup";
  const temporals = searchRoot.querySelectorAll(temporalSelectors);

  for (const el of temporals) {
    // Skip the root timegroup itself and disconnected elements
    if (el === rootTimegroup || !(el as any).isConnected) {
      continue;
    }

    // Find immediate parent timegroup (may be nested, e.g., timegroup within timegroup)
    // Use closest() starting from parentElement to avoid matching the element itself
    const parentTg =
      (el.parentElement?.closest("ef-timegroup") as any) || rootTimegroup;

    // Set both parent and root references
    // - parentTimegroup: Used for start time calculations (evaluateStartTime)
    // - rootTimegroup: Used for ownCurrentTimeMs calculations (determineCurrentTimeSource)
    if ("parentTimegroup" in el) {
      (el as any).parentTimegroup = parentTg;
    }
    if ("rootTimegroup" in el) {
      (el as any).rootTimegroup = rootTimegroup;
    }
  }
}
