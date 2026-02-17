---
name: elements-release
description: npm package release workflow, versioning, and publishing for @editframe packages.
---

# Elements Release

## Published Packages

All published under the `@editframe` scope:

- `@editframe/api`
- `@editframe/react`
- `@editframe/elements`
- `@editframe/assets`
- `@editframe/cli`
- `@editframe/vite-plugin`
- `@editframe/create`

## Release Workflow

### Full release (recommended)

```bash
elements/scripts/prepare-release <version>
```

This runs the complete pre-release validation pipeline:

1. `clean` -- removes build artifacts
2. `typecheck --workspaces` -- type checks all packages
3. `lint` -- runs linter
4. `format` -- checks formatting
5. `verify-package-dependencies.js` -- validates dependency graph
6. Runs node tests (`EF_CACHE_ONLY=true`)
7. Runs browser tests (`EF_CACHE_ONLY=true`, `VITEST_BROWSER_MODE=connect`)
8. `build-all` -- builds all packages
9. `verify-cli-boot` -- verifies CLI can start
10. `verify-package-exports.js` -- validates package exports
11. `version <version>` -- bumps versions, commits, tags, and pushes
12. `clean` -- final cleanup

The `version` step (step 11) handles:
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

1. Build CI runner Docker image
2. `npm ci`
3. `./scripts/build-all`
4. Generate TypeDoc for api, react, elements, assets
5. Type check (skipped for beta tags)
6. Lint + format check
7. Run node tests (skipped for beta tags)
8. Run browser tests (skipped for beta tags)
9. `npm publish --tag latest|beta --workspaces`
10. Create GitHub Release (marked as prerelease for beta tags)

## Monorepo Subtree Workflow

The `elements/scripts/version` script handles the monorepo's subtree split. When run from the monorepo:

1. Detects the `elements` git remote
2. Splits the `elements/` directory into a standalone branch
3. Force-pushes to `elements/main` with `--force-with-lease`
4. Tags both the `elements` and `telecine` remotes
5. Tags the monorepo root at HEAD

This means: **you only need to run `prepare-release` from the monorepo root**. The script handles pushing to the standalone elements repo automatically.

## Key Files

| File | Purpose |
|---|---|
| `elements/.github/workflows/release.yaml` | CI/CD release workflow |
| `elements/scripts/prepare-release` | Full pre-release validation + version + push |
| `elements/scripts/version` | Version bump, commit, tag, subtree push |
| `elements/scripts/prerelease` | Beta version bump |
| `elements/scripts/publish` | Manual npm publish |
| `elements/scripts/build-all` | Build all packages |
| `elements/scripts/verify-cli-boot` | Verify CLI starts |
| `elements/scripts/verify-package-exports.js` | Validate package exports |
| `elements/scripts/deps.js` | Manage inter-package dependencies |
