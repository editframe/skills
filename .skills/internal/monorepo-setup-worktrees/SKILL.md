---
name: monorepo-setup-worktrees
description: git worktrees, git worktree setup, git worktree configuration, branching work syncing branches
---
# Monorepo Worktree System

Scope-based worktree isolation for parallel development streams. Each worktree gets isolated Docker services, databases, and domains.

## Scopes

| Scope | Services | Containers | Create time |
|-------|----------|------------|-------------|
| `elements` | Elements runner + dev-projects only | 2 | ~28s |
| `web` | Elements + telecine core (web, hasura, valkey, maintenance) | 8 | ~1:30 |
| `render` | Elements + telecine core + render pipeline (workers, scheduler) | ~22 | ~2:30 |

Upgrade path: `elements` → `web` → `render`. Downgrade not supported.

## Worktree Management

All worktree operations use the unified CLI: `scripts/worktree <command>`.

```bash
worktree create <branch> [scope]       # Create new worktree (default: web)
worktree list                          # List all worktrees
worktree status [branch]               # Health check
worktree pause <branch>                # Stop containers
worktree resume <branch>               # Start containers
worktree remove <branch> [--force]     # Full cleanup
worktree upgrade <branch> <scope>      # Escalate scope (elements→web→render)
worktree smoke <branch>                # One-shot render verification
worktree logs [branch] [options]       # View logs
worktree doctor [branch] [--skills]    # Diagnose issues
worktree deps [--workspace=...]        # Show dependency graph
```

## Architecture

### Repo layout

```
~/Editframe/
  monorepo -> worktrees/main/monorepo   (symlink for convenience)
  worktrees/
    main/
      .worktree-scope               # scope for main (e.g. "render")
      monorepo/                     # primary monorepo checkout [main]
        telecine -> ../telecine     # symlink
        elements -> ../elements     # symlink
      telecine/                     # primary telecine clone [main]
      elements/                     # primary elements clone [main]
    <branch>/
      .worktree-scope               # scope for this branch
      monorepo/                     # monorepo worktree [branch]
      telecine/                     # telecine git worktree [branch]
      elements/                     # elements git worktree [branch]
```

Main is treated identically to any other worktree. `~/Editframe/monorepo` is a convenience symlink and the entry point for all worktree commands.

`EDITFRAME_DIR` in scripts is always `$(dirname $(dirname $(dirname $(git rev-parse --show-toplevel))))` — three levels up from the monorepo checkout path.

### Shared infrastructure
- `editframe-postgres` — single shared PostgreSQL, each worktree gets its own database (`telecine-<branch>`)
- `editframe-traefik` — shared reverse proxy, routes by `Host` header (`<branch>.localhost`)
- `telecine-runner` / `elements-runner` — shared Docker images (not rebuilt per worktree)

### Database template
`telecine-template` is cloned from `telecine-main` (304 migrations + seed data, ~0.6s clone). Template auto-refreshes when `telecine/scripts/start` runs migrations on main.

### Port offsets
Worktree services use `cksum`-based port offsets (200 slots, spacing of 100) so host tools like Postico can connect. Main worktree uses standard ports.

### Config scripts
- `telecine/scripts/worktree-config` — exports `WORKTREE_ID`, `WORKTREE_DATABASE`, `WORKTREE_DOMAIN`, `WORKTREE_DOCKER_PROJECT_NAME`, port variables
- `elements/scripts/worktree-config` — same pattern for elements
- `.worktree-scope` file in monorepo worktree root tracks current scope

### Docker Compose profiles
- No profile = core services (always start): runner, web, valkey, graphql-engine, data-connector-agent, maintenance
- `render` profile: all worker services, scheduler-go, jit-transcoding
- `dev` profile: tracing, otel-viewer, mailhog, playwright
- `telecine/scripts/start` reads `.worktree-scope` to set `COMPOSE_PROFILES`

### Service startup ordering
Runner must start and `npm install` must complete before other services that execute application code (web, dev-projects, workers). The create and upgrade scripts handle this: `up -d runner` → `npm install` → `up -d` (remaining services).

## Worktree lifecycle

```
create (elements, 28s) → upgrade (web, 63s) → upgrade (render)
     ↓                         ↓
  pause/resume             pause/resume
     ↓
   remove
```

## Dev Server URLs

The elements dev-projects Vite server uses `root: elements/dev-projects/`. Files are served at the root path — **not** under `/dev-projects/`.

- `video.html` → `http://<branch>.localhost:4321/video.html`
- `canvas-demo.html` → `http://<branch>.localhost:4321/canvas-demo.html`

Never include `dev-projects/` in the URL path.

## dev-projects in worktrees

`elements/dev-projects/` is gitignored. Worktrees would only have committed stubs without the full asset/src tree.

`worktree create` sets `DEV_PROJECTS_HOST` in the worktree's `elements/.env` to point at main's dev-projects. The `docker-compose.yaml` dev-projects service mounts this path over `/packages/dev-projects`, so the worktree's dev server always has the full file tree from main.

## Smoke testing

`worktree smoke <branch>` is a one-shot render verification. It's not a persistent scope; use it as a pre-merge gate for render pipeline changes.

1. Requires `web` or `render` scope (errors on `elements`)
2. If scope is `web`: temporarily starts render-profile services, registers a cleanup trap to stop them on exit
3. If scope is `render`: runs against already-running services, no lifecycle management
4. Runs `telecine/scripts/smoke-test.ts` inside the runner container with `EF_HOST=http://web:3000` and the worktree's `EF_TOKEN`
5. Prints the dashboard URL (`http://<branch>.localhost:3000`) for visual inspection of render outputs
6. Prompts to press enter before stopping render services (if they were started)

Render development workflow: stay at `web` scope, run unit tests directly, use `worktree smoke` as the merge gate rather than keeping a full render stack running all day.

`scheduler-go` is a pre-built Go image not managed by docker-compose. `worktree smoke` builds it automatically on first run. `scripts/build-runner-images` also builds it.

## Troubleshooting

- **Port conflict**: two branches hashed to same offset. Extremely unlikely with cksum/200 slots but possible. Remove one worktree and recreate.
- **Orphaned containers**: `worktree doctor` detects orphaned projects (containers with no matching git worktree) and prints the exact `docker rm -f` command to clean them up.
- **Partial create failure**: if `worktree create` fails partway through, the worktree directory exists but is incomplete. Run `worktree remove --force <branch>` before retrying.
- **Stale template**: run `scripts/update-template-db` to refresh from current main DB state.
