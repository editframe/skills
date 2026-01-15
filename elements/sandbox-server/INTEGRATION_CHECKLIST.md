# Sandbox Integration Checklist

## To get `/_sandbox` working in dev-projects server:

1. **Add the plugin to `dev-projects/start.ts`**:
   ```typescript
   import { sandboxPlugin } from "../sandbox-server/vite-plugin.js";
   
   // In your createServer call:
   const server = await createServer({
     plugins: [
       // ... your existing plugins
       sandboxPlugin(), // Add this line
     ],
     // ... rest of config
   });
   ```

2. **Restart the dev server**:
   ```bash
   ./scripts/start-dev-projects
   ```

3. **Check console logs** - You should see:
   ```
   [sandbox-plugin] ✅ Plugin loaded
   [sandbox-plugin] Elements root: /path/to/elements
   [sandbox-plugin] Found X sandboxes: EFDial, EFTimegroup
   [sandbox-plugin] ✅ Middleware registered for /_sandbox/* routes
   ```

4. **Access the routes**:
   - `http://main.localhost:4321/_sandbox/` - Should show index page
   - `http://main.localhost:4321/_sandbox/api/list` - Should return JSON

5. **If it doesn't work, check**:
   - Are the console logs showing? (Plugin might not be loaded)
   - Any errors in the dev server console?
   - Try accessing `/_sandbox/api/list` directly to test the API

## Debugging

If routes aren't working, the middleware logs will show:
- `[sandbox-middleware] GET /_sandbox/` - Route was matched
- If you don't see this, the middleware isn't being called

## Test the plugin standalone

You can test the plugin without the full dev server:
```bash
npx tsx sandbox-server/test-server.ts
# Then visit http://localhost:4321/_sandbox/
```
