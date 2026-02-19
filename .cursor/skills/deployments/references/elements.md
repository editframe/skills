---
name: elements-release
description: npm package release workflow, versioning, and publishing for @editframe packages.
---

# Elements Release

Elements publishes `@editframe` scoped packages to npm. All packages share a single version number.

Run `scripts/deploy-info elements` to see the current package list, version, and release pipeline steps.

## Release Workflow

### Full release (recommended)

```bash
elements/scripts/prepare-release <version>
```

This runs a complete pre-release validation pipeline (typecheck, lint, format, dependency verification, tests, browser tests, build, CLI boot check, export verification) then bumps versions, commits, tags, and pushes.

Run `scripts/deploy-info elements` to see the exact steps `prepare-release` currently executes.

The `version` step at the end of the pipeline handles:
- Writing version to `packages/cli/src/version.ts`
- Running `npm version` across all workspaces
- Updating inter-package dependencies via `scripts/deps.js`
- Committing with message `Bump version to v<version>`
- Creating a git tag `v<version>`
- Pushing the `elements/` subtree to the `elements` remote
- Pushing tags to both `elements` and `telecine` remotes

### Beta prerelease

```bash
elements/scripts/prerelease
```

Bumps all workspaces to the next beta prerelease version (e.g., `1.0.0` -> `1.0.1-beta.0`). This does **not** run validation, build, or push -- it only bumps version numbers locally. You still need to commit, tag, and push manually.

### Manual publish (without prepare-release)

```bash
elements/scripts/publish
```

Publishes all workspaces to npm. Determines the dist-tag from the current git tag:
- Tags containing "beta" -> `npm publish --tag beta`
- All others -> `npm publish --tag latest`

## CI/CD Workflow

Defined in `elements/.github/workflows/release.yaml`. Triggered by pushing **any** git tag.

The workflow builds all packages, runs validation (type check, lint, format, tests -- skipped for beta tags), publishes to npm, and creates a GitHub Release.

## Monorepo Subtree Workflow

The `elements/scripts/version` script handles the monorepo's subtree split. When run from the monorepo:

1. Detects the `elements` git remote
2. Splits the `elements/` directory into a standalone branch
3. Force-pushes to `elements/main` with `--force-with-lease`
4. Tags both the `elements` and `telecine` remotes
5. Tags the monorepo root at HEAD

This means: **you only need to run `prepare-release` from the monorepo root**. The script handles pushing to the standalone elements repo automatically.

## Re-tagging After Post-version Commits

If commits are made to the monorepo after `prepare-release` (e.g. hotfixes), the tag and `elements/main` both need updating. The tag alone is not enough — GitHub will show "This commit does not belong to any branch" and may not trigger CI.

Steps:
```bash
# From monorepo root
git fetch elements main
SPLIT=$(git subtree split --prefix=elements --onto=elements/main --ignore-joins HEAD)
git push elements ${SPLIT}:main --force-with-lease
git push elements :refs/tags/v<version>          # delete remote tag
git tag -f v<version> ${SPLIT}                   # retag at split commit
git push elements v<version>                     # push new tag (triggers CI)
```

Note: Force-pushing a tag without updating the branch first causes CI not to trigger (GitHub deduplicates). Always push the branch commit first, then delete + recreate the tag.

## Monitoring CI Runs

`gh run watch` redraws continuously — avoid it in automated contexts. Use this pattern instead (emits only on status change, blocks until done):

```bash
last=""; while true; do
  cur=$(gh run view <run-id> --repo editframe/elements --json status,conclusion \
    -q '"[\(.status)] \(.conclusion // "pending")"')
  [ "$cur" != "$last" ] && echo "$cur" && last="$cur"
  echo "$cur" | grep -q "completed" && break
  sleep 30
done
```

To check which step failed after a run completes:
```bash
gh run view --job=<job-id> --repo editframe/elements
```

To get the job ID:
```bash
gh run view <run-id> --repo editframe/elements
```

## Known CI-Only Failures

These tests fail in CI but not locally — they must be skipped or marked as CI-incompatible:

- **`ctx.drawElementImage is not a function`** — Chrome's `drawElementImage` canvas API is not available in the headless Chromium used by CI. Tests calling `renderToImageNative` / `captureDomDirectly` with `isNativeCanvasApiAvailable()` must guard with a skip when the API is absent.
- **Visual regression tests** — Snapshots generated locally (macOS) differ from CI (Linux) due to font rendering differences. Snapshots must be generated on Linux or tests must use a tolerance threshold appropriate for cross-platform rendering.
- **Performance assertions** — Tests asserting minimum frame counts or throughput numbers are inherently flaky across machines. Either remove hard numeric assertions or make them very conservative.
