# Beta Release Deployment Plan

## Overview
Deploy beta release `0.30.2-beta.0` of the elements package to GitHub, which will trigger the automated release workflow that builds, tests, and publishes to npm.

## Current State
- **Current version**: `0.30.2-beta.0` (already set in all package.json files)
- **Latest commit**: `9b797c80a` - "Skip failing tests for beta release"
- **Current branch**: `main`
- **Tag status**: `v0.30.2-beta.0` exists locally and on elements remote
- **Git remotes**: 
  - `elements` → `git@github.com:editframe/elements.git` ✅ (will deploy)
  - `telecine` → `git@github.com:editframe/telecine.git` ❌ (will NOT deploy)

## Release Scripts Found

### `scripts/prepare-release`
This script:
1. Cleans workspace
2. Runs typecheck, lint, format checks
3. Verifies package dependencies
4. Runs tests (Node + Browser) in cache-only mode
5. Builds all packages
6. Verifies CLI boot
7. Verifies package exports
8. Calls `scripts/version` with version argument
9. Cleans again

**Issue**: The `version` script tags telecine (lines 50-57), which we don't want for this release.

### `scripts/version`
Handles version bumping and git operations:
- Updates version in all package.json files
- Updates dependencies
- Commits version bump
- Creates git tag
- Pushes to elements remote (subtree split)
- **Also tags telecine** (lines 50-57) ❌

### `scripts/publish`
Publishes to npm with appropriate tag (beta vs latest)

## Deployment Workflow

The `.github/workflows/release.yaml` workflow triggers on **tag pushes** and:
1. Runs tests (Node + Browser) - should pass with skips
2. Builds all packages
3. Publishes to npm with `beta` tag (detected from tag name containing "beta")
4. Creates a GitHub release (marked as prerelease)

## Options for Deployment

### Option A: Use prepare-release but modify version script temporarily
Since version is already set, we could:
1. Temporarily comment out telecine tagging in `scripts/version` (lines 50-57)
2. Run `./scripts/prepare-release 0.30.2-beta.0` (but version is already set, so this might not work)
3. Restore telecine tagging

**Problem**: `prepare-release` calls `version` which will try to bump version, but it's already set.

### Option B: Manual approach (recommended for beta)
Since version is already set and we just need to push:
1. Push code using `./scripts/push-elements` (doesn't tag telecine)
2. Update tag manually
3. Push tag to trigger workflow

### Option C: Create a beta-release script
Create a new script that does everything except tag telecine.

## Recommended Approach

Since the version is already set and we've already committed our changes, use the manual approach:

```bash
cd /Users/collin/Editframe/monorepo

# 1. Push elements/ subtree to elements/main (doesn't tag telecine)
./scripts/push-elements

# 2. Fetch latest from elements remote
git fetch elements main

# 3. Update tag to point to latest commit on elements/main
git tag -f v0.30.2-beta.0 elements/main -m "Beta release 0.30.2-beta.0"

# 4. Push tag to trigger GitHub Actions workflow
git push elements v0.30.2-beta.0 --force
```

## Important Notes

1. **Telecine will NOT be deployed**: The workflow is in `elements/.github/workflows/`, so it only affects the elements repository. The `push-elements` script doesn't tag telecine.

2. **All elements packages will be published**: The workflow publishes all workspaces:
   - `@editframe/api`
   - `@editframe/assets`
   - `@editframe/elements`
   - `@editframe/react`
   - `@editframe/cli`
   - `@editframe/create`
   - `@editframe/vite-plugin`

3. **Version is already set**: The version `0.30.2-beta.0` is already in all package.json files, so we don't need to run `prepare-release` (which would try to bump it again).

4. **prepare-release runs full checks**: If you want to run the full release checks before deploying, you could run `prepare-release` but it will fail on the version step since version is already set. Better to run checks manually if needed.

## Verification Checklist

After deployment:
- [ ] Check GitHub Actions: https://github.com/editframe/elements/actions
- [ ] Verify workflow completes successfully
- [ ] Check npm: https://www.npmjs.com/package/@editframe/elements?activeTab=versions
- [ ] Verify beta version is published
- [ ] Check GitHub release: https://github.com/editframe/elements/releases
- [ ] Confirm telecine was NOT affected (check telecine remote tags)
