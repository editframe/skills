# Build Cache Cleanup Required

The old docs routes have been removed from the codebase, but the build cache still contains references to them.

## Solution

Clear the build cache and rebuild:

```bash
# From the telecine directory
cd telecine

# Remove build artifacts
rm -rf services/web/build
rm -rf services/web/.react-router
rm -rf services/web/.cache
rm -rf services/web/public/build

# If using Docker, you may also need to rebuild the container
# or restart the dev server
```

## What Was Removed

- 196 MDX documentation files from `telecine/services/web/app/content/docs/`
- 70 documentation components from `telecine/services/web/app/components/docs/`
- 22 documentation route files from `telecine/services/web/app/routes/docs/`
- All route definitions in `routes.ts` for `/docs/*` paths

## What Was Updated

- Navigation links changed from `/docs` to `/skills`
- Sitemap now includes all skills pages
- Created minimal shared components for guides/blog compatibility

The new skills-based documentation is available at `/skills`.
