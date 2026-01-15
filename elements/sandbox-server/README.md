# Sandbox Server Integration

This directory contains the server-side code for the Element Sandbox System.

## Integration with dev-projects server

Since `dev-projects/` is gitignored, you'll need to integrate the sandbox middleware into your existing `dev-projects/start.ts` file (which runs via `npx tsx ./dev-projects/start.ts` in the Docker container).

### Option 1: Vite Plugin (Recommended)

If your `dev-projects/start.ts` uses Vite's `createServer`, add the sandbox plugin:

```typescript
import { createServer } from "vite";
import { sandboxPlugin } from "../sandbox-server/vite-plugin.js";

const server = await createServer({
  plugins: [
    // ... your existing plugins
    sandboxPlugin(), // Add this line
  ],
  // ... rest of your config
});

await server.listen(4321);
console.log("Listening on 4321");
```

The plugin will automatically detect the monorepo root and add sandbox routes to `/_sandbox/*`.

### Option 2: Express/HTTP Server Middleware

If you're using Express or a raw HTTP server:

```typescript
import { createSandboxMiddleware } from "../sandbox-server/index.js";
import * as path from "node:path";

// In your server setup:
const elementsRoot = path.resolve(__dirname, "..");
const sandboxMiddleware = createSandboxMiddleware(elementsRoot);

// Add before other routes:
app.use(sandboxMiddleware);
// or
server.on("request", async (req, res) => {
  await sandboxMiddleware(req, res, () => {
    // Handle other routes
  });
});
```

## Routes

The middleware handles these routes:
- `/_sandbox/` - Index page listing all sandboxes
- `/_sandbox/:name` - Individual sandbox viewer
- `/_sandbox/api/list` - JSON API for sandbox list
- `/_sandbox/api/:name/scenarios` - JSON API for scenario list
- `/_sandbox/api/:name/config` - JSON API for sandbox config
- `/_sandbox/api/:name/run/:scenario` - Trigger scenario execution (validation only)
