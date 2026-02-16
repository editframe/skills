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

After making changes, run the relevant test suite to verify abort behavior works correctly.

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
- [ ] **Tests pass**: Run the relevant test suite and verify no unexpected errors

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
