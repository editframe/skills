# Sandbox Server Integration

This directory contains the server-side code for the Element Sandbox System.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     SANDBOX ROUTING                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Vite Dev Server (dev-projects/start.ts:4321)                   │
│  └── sandboxPlugin() from sandbox-server/vite-plugin.ts         │
│                                                                  │
│  /sandbox/api/*  → API middleware (JSON responses)             │
│  /sandbox/*      → SPA fallback → sandbox.html                 │
│                                                                  │
│  sandbox.html loads sandbox-app/main.tsx                        │
│  └── React Router handles all app routing                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Integration with Vite

Add the sandbox plugin to your Vite config:

```typescript
import { createServer } from "vite";
import { sandboxPlugin } from "../sandbox-server/vite-plugin.js";

const server = await createServer({
  plugins: [
    sandboxPlugin(), // Handles /sandbox/* routes
  ],
});

await server.listen(4321);
```

## Routes

### App Routes (React SPA)
- `/sandbox` - List view with tree navigation
- `/sandbox/:sandboxName` - Detail view (sandbox with scenarios)
- `/sandbox/:sandboxName/:scenarioName` - Detail view (specific scenario)

### API Routes (JSON)
- `/sandbox/api/list` - List all discovered sandboxes
- `/sandbox/api/relationships` - Sandbox dependency graph
- `/sandbox/api/:name/config` - Get sandbox file path
- `/sandbox/api/:name/scenarios` - List scenarios
- `/sandbox/api/:name/run/:scenario` - Validate scenario exists
