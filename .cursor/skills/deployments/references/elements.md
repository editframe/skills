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
