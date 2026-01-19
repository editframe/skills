# Quick Start: Add Sandbox Routes to dev-projects

## Step 1: Add Plugin to dev-projects/start.ts

Open `dev-projects/start.ts` and add the sandbox plugin:

```typescript
import { sandboxPlugin } from "../sandbox-server/vite-plugin.js";

// In your createServer call, add to plugins array:
const server = await createServer({
  plugins: [
    // ... your existing plugins
    sandboxPlugin(), // ← Add this line
  ],
  // ... rest of config
});
```

## Step 2: Restart Dev Server

```bash
./scripts/start-dev-projects
```

## Step 3: Check Console Logs

You should see:
```
[sandbox-plugin] ✅ Plugin loaded
[sandbox-plugin] Elements root: /path/to/elements
[sandbox-plugin] Found 2 sandboxes: EFDial, EFTimegroup
[sandbox-plugin] ✅ Middleware registered for /sandbox/* routes
```

## Step 4: Test the Routes

- Browser: `http://main.localhost:4321/sandbox/`
- API: `http://main.localhost:4321/sandbox/api/list`

## Troubleshooting

**If you don't see the plugin logs:**
- Plugin isn't being loaded - check that `sandboxPlugin()` is in the plugins array
- Check for import errors in the dev server console

**If routes return 404:**
- Check that you see `[sandbox-plugin] 📦 Handling sandbox route: GET /sandbox/` in logs
- If you don't see this, the middleware isn't being called (plugin not loaded or wrong order)

**If you see "Found 0 sandboxes":**
- Check the Elements root path in the logs
- Verify sandbox files exist: `find packages/elements/src -name "*.sandbox.ts"`
