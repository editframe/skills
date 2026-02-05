# SSR-Safe Imports for Editframe

## Problem

The Editframe elements package had browser-specific code that executed at module initialization:

1. `renderTimegroupToCanvas.ts` had `window.debugCaptureThumbnail` assigned at module level
2. Importing `@editframe/react` caused the entire render pipeline to load
3. This broke server-side rendering (SSR) in frameworks like Remix, Next.js, etc.

## Solution

We've implemented a comprehensive three-part solution:

### 1. Type-Only Modules (Zero Side Effects)

Created dedicated type files that can be safely imported anywhere:

- `preview/renderTimegroupToVideo.types.ts` - All render types
- `preview/renderTimegroupToCanvas.types.ts` - All canvas types

These files have:
- ✅ Zero imports
- ✅ Zero side effects
- ✅ Safe for SSR, Node.js, browser

### 2. Dynamic Imports (Lazy Loading)

Render utilities are now loaded dynamically only when called:

**Before:**
```typescript
import { renderTimegroupToVideo } from "../preview/renderTimegroupToVideo.js";

async renderToVideo(options) {
  return renderTimegroupToVideo(this, options);
}
```

**After:**
```typescript
import type { RenderToVideoOptions } from "../preview/renderTimegroupToVideo.types.js";

async renderToVideo(options: RenderToVideoOptions) {
  // Only loads when actually called (in browser context)
  const { renderTimegroupToVideo } = await import("../preview/renderTimegroupToVideo.js");
  return renderTimegroupToVideo(this, options);
}
```

### 3. Separate Entry Points

Created SSR-safe entry points with zero browser dependencies:

#### For Elements Package:

```json
{
  "exports": {
    ".": "./dist/index.js",           // Browser (full functionality)
    "./server": "./dist/server.js",    // SSR-safe (types + components)
    "./node": "./dist/node.js"         // Node.js tools (getRenderInfo only)
  }
}
```

#### For React Package:

```json
{
  "exports": {
    ".": "./dist/index.js",           // Browser (full functionality)
    "./server": "./dist/server.js"    // SSR-safe (components only)
  }
}
```

## Usage

### Browser Context (Full Features)

```typescript
// Full functionality - GUI, rendering, preview
import { Timegroup, Video, Text } from '@editframe/react';
import type { RenderToVideoOptions } from '@editframe/react';
```

### Server-Side Rendering (SSR)

```typescript
// SSR-safe - components only, no browser utilities
import { Timegroup, Video, Text } from '@editframe/react/server';
import type { RenderToVideoOptions } from '@editframe/react/server';
```

### Node.js Tools

```typescript
// Minimal - just getRenderInfo for CLI tools
import { getRenderInfo } from '@editframe/elements/node';
```

## Files Changed

### Core Changes:
1. ✅ `elements/src/preview/renderTimegroupToVideo.types.ts` - Created
2. ✅ `elements/src/preview/renderTimegroupToCanvas.types.ts` - Created
3. ✅ `elements/src/server.ts` - Created SSR entry point
4. ✅ `react/src/server.ts` - Created SSR entry point

### Updated Imports:
5. ✅ `elements/src/index.ts` - Export types only from render modules
6. ✅ `elements/src/elements/EFTimegroup.ts` - Dynamic import for renderToVideo
7. ✅ `elements/src/gui/EFWorkbench.ts` - Dynamic imports for render functions
8. ✅ `elements/src/render/EFRenderAPI.ts` - Dynamic imports for render functions
9. ✅ `elements/src/preview/renderTimegroupToCanvas.ts` - Guard window access
10. ✅ `elements/src/preview/renderTimegroupToVideo.ts` - Use type imports

### Package Configuration:
11. ✅ `elements/package.json` - Added `./server` export
12. ✅ `react/package.json` - Added `./server` export

## Testing

To verify SSR works:

```bash
# In telecine web service
cd telecine/services/web
npm run dev

# The index route should load without "window is not defined" errors
```

## Browser Code Guards

All browser-specific code now has guards:

```typescript
// Before (crashes in Node.js)
(window as any).debugCaptureThumbnail = async function() { ... };

// After (safe everywhere)
if (typeof window !== "undefined") {
  (window as any).debugCaptureThumbnail = async function() { ... };
}
```

```typescript
// Before (crashes in Node.js)
const dpr = window.devicePixelRatio || 1;

// After (safe everywhere)
const dpr = (typeof window !== "undefined" ? window.devicePixelRatio : 1) || 1;
```

## Benefits

1. **Zero Breaking Changes** - Existing browser code works identically
2. **SSR Support** - Components can be rendered server-side
3. **Smaller Bundles** - Render utilities only load when needed
4. **Type Safety** - Full TypeScript types available everywhere
5. **Better DX** - Clear separation between browser/server code

## Migration Guide

### For SSR Routes (Remix, Next.js)

Replace:
```typescript
import { Timegroup } from '@editframe/react';
```

With:
```typescript
import { Timegroup } from '@editframe/react/server';
```

### For Browser-Only Code

No changes needed! Keep using:
```typescript
import { Timegroup } from '@editframe/react';
```

### For Node.js Tools

Use the minimal export:
```typescript
import { getRenderInfo } from '@editframe/elements/node';
```
