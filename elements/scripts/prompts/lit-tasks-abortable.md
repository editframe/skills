# Guide: Making Lit Tasks Fully Abortable

## Overview

Lit Tasks (`@lit/task`) provide an `AbortSignal` via the task context. When a task is cancelled (element disconnected, task re-run, etc.), this signal is aborted. However, **the signal must be explicitly passed through the entire call chain** for requests to actually abort.

---

## Analysis Phase

### 1. Identify All Task Definitions

Search for task definitions in the file:

```bash
grep -n "new Task\|Task<" <file>
```

### 2. Trace the Signal Flow

For each task, answer:
- [ ] Does the task function receive `{ signal }` from the context?
- [ ] Is the signal passed to ALL async operations (fetch, other tasks, utilities)?
- [ ] Are there any `new AbortController()` calls that create orphan signals?

**Red Flag Example:**
```typescript
// ❌ BAD: Creates orphan signal that can never be aborted
task: async () => {
  await someAsyncFunction(new AbortController().signal);
}
```

**Correct Example:**
```typescript
// ✅ GOOD: Uses task's signal
task: async ([args], { signal }) => {
  await someAsyncFunction(signal);
}
```

### 3. Check Abort Points

Between async operations, verify:
- [ ] Is `signal?.throwIfAborted()` called after slow operations?
- [ ] Are early returns added for aborted state?

---

## Testing Phase

### Important: Sandbox Files May Not Exist Yet

**Many files that define Lit Tasks don't have corresponding sandbox files yet.** This is expected because:
- Task factory functions (e.g., `makeMediaEngineTask.ts`) are pure functions without GUI components
- Utility functions and mixins may not have visual elements to test
- The sandbox system was originally designed for GUI elements

**For files without sandbox files:**
- If the file is a task factory or utility function, you can create a functional sandbox (see below)
- If the file is part of an element class that already has a sandbox, add scenarios to the existing sandbox
- If the file is a mixin or shared utility, consider creating a minimal test element that uses it

### 1. Create Reproduction Test

#### For GUI Elements (with existing sandbox files)

If the file defines tasks on an element class that already has a sandbox:

```typescript
// Add to existing sandbox file (e.g., EFMedia.sandbox.ts)
async "aborts cleanly when element is disconnected"(ctx) {
  const element = ctx.querySelector("ef-media");
  
  // Start the task
  element.src = "/assets/test.mp4";
  await ctx.frame();
  
  // Immediately disconnect
  element.remove();
  await ctx.frame();
  
  // Wait for any in-flight requests to settle
  await new Promise(r => setTimeout(r, 100));
  
  // Check: no console.error should have been called
  // (Your test framework should capture this)
}
```

#### For Task Factories and Utility Functions (no GUI)

If the file is a task factory function (e.g., `makeMediaEngineTask.ts`) or utility function, create a functional sandbox:

```typescript
// makeMediaEngineTask.sandbox.ts
import { defineSandbox } from "../sandbox/index.js";
import { html, nothing } from "lit";
import { makeMediaEngineTask } from "./makeMediaEngineTask.js";
import "../elements/EFMedia.js"; // Import to register custom element

export default defineSandbox({
  name: "makeMediaEngineTask",
  description: "Task factory for creating media engine tasks with abort support",
  category: "elements",
  subcategory: "media",
  
  // Use 'nothing' for functional tests - no GUI rendering needed
  render: () => nothing,
  
  scenarios: {
    async "aborts cleanly when element is disconnected"(ctx) {
      // Create a test element in memory (not in DOM initially)
      const container = ctx.getContainer();
      const element = document.createElement("ef-media") as import("../EFMedia.js").EFMedia;
      element.src = "/assets/test.mp4";
      container.appendChild(element);
      await ctx.frame();
      
      // Create the task
      const task = makeMediaEngineTask(element);
      
      // Start the task (triggers fetch)
      await ctx.frame();
      
      // Immediately disconnect
      element.remove();
      await ctx.frame();
      
      // Wait for any in-flight requests to settle
      await new Promise(r => setTimeout(r, 100));
      
      // Verify task was aborted (check task state or error handling)
      ctx.expect(element.isConnected).toBe(false);
    },
    
    async "propagates signal through call chain"(ctx) {
      const container = ctx.getContainer();
      const element = document.createElement("ef-media") as import("../EFMedia.js").EFMedia;
      element.src = "/assets/test.mp4";
      container.appendChild(element);
      await ctx.frame();
      
      const task = makeMediaEngineTask(element);
      
      // Test that signal is properly passed through
      // (Implementation depends on your specific test needs)
      await ctx.frame();
      
      // Clean up
      element.remove();
    },
  },
});
```

**Key points for functional sandboxes:**
- Use `render: () => nothing` from `lit` - this renders nothing but satisfies the sandbox API
- Create test elements programmatically in scenarios using `document.createElement()`
- Test the functional behavior directly without needing visual rendering
- Clean up elements after each scenario

### 2. Run With Concurrency

Test with multiple workers to expose race conditions:

```bash
# If sandbox exists
./scripts/ef run <SandboxName> -j 12

# Check for unexpected errors
./scripts/ef info errors --unexpected --session <session-id>
```

**If no sandbox exists yet:**
- Create the sandbox file first (see above)
- Then run the scenarios to verify abort behavior

### 3. Verify Error Types

Check that errors during abort are `AbortError` (not `TypeError: Failed to fetch`):

```bash
./scripts/ef info errors fetch --session <session-id>
```

---

## Coding Phase

### Step 1: Accept Signal in Task

```typescript
// Before
task: async () => {
  return await createMediaEngine(host);
}

// After
task: async ([_args], { signal }) => {
  return await createMediaEngine(host, signal);
}
```

### Step 2: Propagate Signal Through Functions

```typescript
// Before
export const createMediaEngine = (host: EFMedia): Promise<MediaEngine> => {
  return AssetMediaEngine.fetch(host, urlGenerator, src);
}

// After
export const createMediaEngine = (
  host: EFMedia, 
  signal?: AbortSignal
): Promise<MediaEngine> => {
  return AssetMediaEngine.fetch(host, urlGenerator, src, signal);
}
```

### Step 3: Use Signal in Fetch Calls

```typescript
// Before
static async fetch(host: EFMedia, src: string) {
  await engine.fetchInitSegment(
    { trackId, src },
    new AbortController().signal  // ❌ Orphan signal
  );
}

// After
static async fetch(host: EFMedia, src: string, signal?: AbortSignal) {
  const validationSignal = signal ?? new AbortController().signal;
  
  await engine.fetchInitSegment(
    { trackId, src },
    validationSignal  // ✅ Uses passed signal
  );
}
```

### Step 4: Add Abort Checks Between Operations

```typescript
static async fetch(host: EFMedia, src: string, signal?: AbortSignal) {
  const data = await engine.fetchManifest(url);
  
  // Check abort after slow network operation
  signal?.throwIfAborted();
  
  engine.durationMs = calculateDuration(data);
  
  // Validate video track
  await engine.fetchInitSegment({ trackId, src }, signal);
  
  // Check abort between validations
  signal?.throwIfAborted();
  
  // Validate audio track
  await engine.fetchInitSegment({ trackId, src }, signal);
  
  return engine;
}
```

### Step 5: Re-throw AbortError in Catch Blocks

```typescript
try {
  await engine.fetchInitSegment({ trackId, src }, signal);
} catch (error) {
  // ✅ Re-throw AbortError to propagate cancellation
  if (error instanceof DOMException && error.name === "AbortError") {
    throw error;
  }
  
  // Handle other errors...
  if (error.message.includes("401")) {
    throw new Error(`Authentication required: ${error.message}`);
  }
}
```

### Step 6: Handle Disconnected Elements in FetchMixin

For the lowest-level fetch wrapper, detect disconnected elements:

```typescript
return fetchPromise.catch((error) => {
  const isAbortError = error.name === "AbortError" ||
    error.message.includes("signal is aborted");
  
  // Element was removed during fetch
  const isDisconnected = !this.isConnected;
  
  // Browser aborts fetch on navigation (throws TypeError, not AbortError)
  const isNavigationAbort = isDisconnected && 
    error instanceof TypeError && 
    error.message === "Failed to fetch";
  
  if (!isAbortError && !isDisconnected && !isNavigationAbort) {
    console.error("FetchMixin fetch error", url, error);
  }
  
  throw error;
});
```

---

## Verification Checklist

After changes, verify:

- [ ] **No orphan signals**: Search for `new AbortController()` - each should have clear ownership
- [ ] **Signal passed to all fetches**: Trace from task → utility functions → fetch calls
- [ ] **Abort checks between operations**: `signal?.throwIfAborted()` after slow async work
- [ ] **AbortError re-thrown**: Catch blocks don't swallow AbortError
- [ ] **Tests pass with concurrency**: `./scripts/ef run -j 12` shows 0 unexpected errors (if sandbox exists)
- [ ] **Single-worker tests pass**: `./scripts/ef run -j 1` shows 0 unexpected errors (if sandbox exists)
- [ ] **Isolated test passes**: Running just one sandbox shows no errors (if sandbox exists)
- [ ] **Sandbox created if needed**: For task factories/utilities, create functional sandbox with `render: () => nothing`

---

## Common Patterns

### Pattern: Graceful Return on Undefined Media Engine

When a task depends on another task that may return `undefined`:

```typescript
task: async ([args], { signal }) => {
  const mediaEngine = await getLatestMediaEngine(host, signal);
  
  // Gracefully handle undefined instead of crashing
  if (!mediaEngine) return undefined;
  
  // Continue with valid media engine...
}
```

### Pattern: Optional Signal with Fallback

For backwards compatibility when signal may not be provided:

```typescript
static async fetch(src: string, signal?: AbortSignal) {
  const effectiveSignal = signal ?? new AbortController().signal;
  // Use effectiveSignal everywhere
}
```

### Pattern: Check Abort Before Expensive Operations

```typescript
task: async ([args], { signal }) => {
  // Check before starting expensive work
  if (signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }
  
  const result = await expensiveOperation();
  
  // Check after, before using result
  signal?.throwIfAborted();
  
  return processResult(result);
}
```
