---
alwaysApply: false
---
# Monorepo Setup with Git Worktrees

## Overview

Monorepo containing two projects:
- **telecine**: `/workspace/telecine/`
- **elements**: `/workspace/elements/`

Both projects use git worktrees with separate remotes:
- `telecine`: `git@github.com:editframe/telecine.git`
- `elements`: `git@github.com:editframe/elements.git`

## Worktree Setup

### Telecine Worktrees

Each worktree:
- Has its own directory (e.g., `../telecine-feature-auth` for branch `feature-auth`)
- Gets unique domain: `feature-auth.localhost`
- Uses isolated Docker Compose project names: `telecine-feature-auth`
- Shares common Traefik instance for routing

**Worktree Configuration**: `telecine/scripts/worktree-config`
- Detects current branch and worktree context
- Exports: `WORKTREE_BRANCH`, `WORKTREE_DOMAIN`, `WORKTREE_DOCKER_PROJECT_NAME`, `WORKTREE_DOCKER_NETWORK_NAME`
- Must be sourced: `. scripts/worktree-config`

See `telecine/WORKTREE_SETUP.md` for detailed Docker setup.

### Elements Worktrees

Similar structure:
- Docker project names: `ef-elements` (main) or `ef-elements-<branch-name>` (worktrees)
- Unique domains: `main.localhost` or `<branch-name>.localhost`
- Accessible at `http://<branch-name>.localhost:4321`

**Worktree Configuration**: `elements/scripts/worktree-config` (same structure as telecine)

**Elements Services** (via `process-compose`):
- `compose`: Docker Compose runner for tests
- `dev-projects`: Development server (routed through Traefik)
- `host-chrome`: Playwright browser server (macOS host, shared across worktrees)

## Push/Pull Workflows

### Pushing to Remotes

Use push scripts (recommended) - they use `git subtree split` to extract only the project directory:

```bash
# Push telecine/ to telecine remote (defaults to main)
./scripts/push-telecine
./scripts/push-telecine <branch-name>
./scripts/push-telecine --wait  # Wait for deployment

# Push elements/ to elements remote (defaults to main)
./scripts/push-elements
./scripts/push-elements <branch-name>
./scripts/push-elements --wait  # Wait for release
```

**How it works**: Creates temporary branch via `git subtree split`, pushes with `--force`, cleans up. Safe because subtree branches don't conflict with monorepo structure.

**Alternative** (direct git push - pushes entire monorepo):
```bash
git push telecine <branch-name>:<branch-name>
git push elements <branch-name>:<branch-name>
```

### Pulling from Remotes

```bash
git fetch telecine
git fetch elements
git merge telecine/<branch-name>
git merge elements/<branch-name>
```

### Creating Worktrees

```bash
git worktree add ../telecine-<branch-name> <branch-name>
git worktree add ../elements-<branch-name> <branch-name>
```

### Syncing Strategy

Monorepo is primary working repository:
1. Commit in monorepo
2. Push to remote using push scripts when ready
3. Pull from remotes when syncing upstream changes

**Important**: Push scripts use `git subtree split` to extract only the project directory, ensuring clean separation between monorepo and individual project repositories.

### Dev Examples in Worktrees

When creating dev examples (e.g., `elements/dev-projects/`):
1. Create in worktree as needed
2. Commit to feature branch (use `git add -f` if `dev-projects/` is ignored)
3. Merge to main (dev examples included)
4. Dev examples stay in main as shared development examples

```bash
cd elements/dev-projects
# Create your-example.html
git add -f elements/dev-projects/your-example.html
git commit -m "feat: add your-example.html dev example"
```

**Note**: Important dev examples should be force-added and committed to main so they're available to all developers.

## Scripts

### Script Locations
- Root: `/workspace/scripts/` - Delegates to telecine/elements scripts
- Telecine: `/workspace/telecine/scripts/`
- Elements: `/workspace/elements/scripts/`

### Root Script Wrappers

**`scripts/docker-compose`**: Delegates to `telecine/scripts/docker-compose`
- Consistent docker-compose behavior across monorepo
- Worktree-aware configuration automatically applied
- All docker-compose files discovered and included

**`scripts/docker`**: Delegates to `telecine/scripts/docker`
- Project-specific docker command customization
- Consistent entry point across monorepo

**`scripts/start`**: Starts both telecine and elements services
- Telecine: npm install, build, docker-compose, migrations, seeding
- Elements: via process-compose (background)
- Displays worktree-specific URLs

**`scripts/start-host`**: Starts host-level services (macOS host only)
- **Host Chrome**: Playwright browser server for tests
- Shared across all worktrees
- Must run on macOS host (outside dev container)

**`scripts/npm` (Telecine)**: `telecine/scripts/npm` wraps npm commands
- Executes in telecine project directory
- Handles worktree-aware configuration
- **Always use this instead of direct npm** for telecine

```bash
cd /workspace/telecine && ./scripts/npm install <package-name>
cd /workspace/telecine && ./scripts/npm run <script-name>
```

**Other Script Runners**: Project-specific scripts (`npm`, `node`, `npx`, etc.) in respective project directories. Handle worktree-aware configuration.

### `scripts/browsertest`

**Important**: **ALWAYS use `browsertest` scripts for browser tests. Do NOT run vitest directly.**

Both projects have `browsertest` scripts that:
- Automatically start browser server if not running
- Set up environment variables (`MONOREPO_ROOT`, `WS_ENDPOINT`, `VITEST_BROWSER_MODE`)
- Load worktree configuration for domain routing
- Use correct vitest browser config (`vitest.config.browser.ts`)
- Handle monorepo root detection across worktrees

**Telecine**:
```bash
cd /workspace/telecine && ./scripts/browsertest
cd /workspace/telecine && ./scripts/browsertest <test-file>
cd /workspace/telecine && ./scripts/browsertest --grep "pattern"
cd /workspace/telecine && ./scripts/browsertest --watch
```

**Elements**:
```bash
cd /workspace/elements && ./scripts/browsertest
cd /workspace/elements && ./scripts/browsertest <test-file>
cd /workspace/elements && ./scripts/browsertest --grep "pattern"
cd /workspace/elements && ./scripts/browsertest --watch
```

**Test File Naming**: Must be `*.browsertest.ts` or `*.browsertest.tsx`

**Browser Server**: Managed automatically by browsertest scripts
- If `.wsEndpoint.json` doesn't exist at monorepo root, script starts browser server
- Shared across all worktrees
- Must run on macOS host (not in containers)
- Manual start: `./scripts/start-host-chrome` from monorepo root
- Managed via shared `.wsEndpoint.json` at monorepo root

## Docker Environment

Both projects use Docker Compose with worktree-aware configuration:
- Each worktree gets isolated Docker resources
- Shared Traefik instance routes traffic based on branch-specific domains
- `.localhost` domains auto-resolve on macOS

### Traefik Routing

- **Telecine**: `http://<branch-name>.localhost:3000`
- **Elements**: `http://<branch-name>.localhost:4321`
- **Traefik dashboard**: `http://localhost:7777`

Elements dev servers connect to shared `telecine-traefik` network, routed via `elements` entrypoint (port 4321).

### Process Compose

Elements services orchestrated via `process-compose`:
- Configuration: `elements/process-compose.yaml`
- Manages: Docker Compose runner, dev-projects server, host-chrome (optional)
- Host-chrome dependency optional (`required: false`) for manual macOS host startup
- Installed in dev container, should be available on macOS host

See `telecine/WORKTREE_SETUP.md` for detailed Docker setup.

# Fallbacks

It is tempting to make something work by creating a fallback. However, this is a bad idea. It is better to fix the root cause of the problem. It's better to CRASH and burn than to create a fallback.

# TESTING
When the user describes an issue to fix, always first write a test that reproduces the issue so the fix can be verified. Get the user to verify the test makes sense before starting to work on the fix. **CRITICAL: You MUST run the reproduction test to verify it actually fails before implementing the fix. This ensures the test correctly captures the bug and will pass once the fix is applied.**
