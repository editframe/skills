# Preview Module Logging

By default, all logging in the preview module is **disabled** to reduce console noise during normal operation.

## Enabling Logging

To enable logging, set the log level using one of these methods:

### Method 1: Environment Variable

```bash
EF_LOG_LEVEL=debug npm start
```

### Method 2: Global Flag (Browser Console)

```javascript
globalThis.EF_LOG_LEVEL = 'debug';
```

## Log Levels

From most verbose to least verbose:

- **`debug`** - All logs including performance metrics, adaptive resolution changes, prefetch operations
- **`info`** - Informational messages
- **`warn`** - Warnings (worker pool fallbacks, image inlining failures, canvas draw errors)
- **`error`** - Errors only (worker errors, canvas preview failures, stats tracking errors)
- **`silent`** - No logging (default)

## Examples

### Debug all preview operations
```bash
EF_LOG_LEVEL=debug npm start
```

### See only warnings and errors
```bash
EF_LOG_LEVEL=warn npm start
```

### Disable all logging (default)
```bash
npm start
```

## What Gets Logged

### Debug Level
- Performance metrics: `[captureFromClone]`, `[renderTimegroupToCanvas]`, `[renderTimegroupToVideo]`
- Resolution scaling: Adaptive resolution tracker changes
- Prefetch operations: Video segment prefetching

### Warn Level
- Worker pool fallbacks to main thread
- Image inlining failures
- Canvas draw errors
- Audio codec selection issues

### Error Level
- Worker initialization failures
- Canvas preview render failures
- Stats tracking failures

## Implementation

The logging system is centralized in `/src/preview/logger.ts` and used throughout the preview module:

```typescript
import { logger } from "./logger.js";

// Debug logs (performance, resolution changes)
logger.debug(`[component] Performance: ${time}ms`);

// Warnings (non-critical issues)
logger.warn("[component] Fallback to main thread");

// Errors (critical failures)
logger.error("Canvas preview render failed:", error);
```
