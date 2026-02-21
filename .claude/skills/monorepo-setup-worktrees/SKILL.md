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

## Scripts

All scripts run from the main worktree root:

```bash
scripts/create-worktree <branch> [elements|web|render]  # default: web
scripts/pause-worktree <branch>                          # docker stop, ~1s
scripts/resume-worktree <branch>                         # docker start, ~1-7s
scripts/upgrade-worktree <branch> <new-scope>            # escalate scope
scripts/remove-worktree [--force] <branch>               # full cleanup
scripts/build-runner-images                              # rebuild shared Docker images
scripts/update-template-db                               # refresh template from main DB
```

## Architecture

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
- `.worktree-scope` file in worktree root tracks current scope

### Docker Compose profiles
- No profile = core services (always start): runner, web, valkey, graphql-engine, data-connector-agent, maintenance
- `render` profile: all worker services, scheduler-go, jit-transcoding
- `dev` profile: tracing, otel-viewer, mailhog, playwright
- `telecine/scripts/start` reads `.worktree-scope` to set `COMPOSE_PROFILES`

### Service startup ordering
Runner must start and `npm install` must complete before other services that execute application code (web, dev-projects, workers). The create and upgrade scripts handle this: `up -d runner` → `npm install` → `up -d` (remaining services).

## Worktree lifecycle

```
create (elements, 28s) → pause (1s) → resume (1s) → upgrade (web, 63s) → remove (16s)
                                                          ↓
                                                    upgrade (render)
```

## Dev Server URLs

The elements dev-projects Vite server uses `root: elements/dev-projects/`. Files are served at the root path — **not** under `/dev-projects/`.

- `video.html` → `http://<branch>.localhost:4321/video.html`
- `canvas-demo.html` → `http://<branch>.localhost:4321/canvas-demo.html`

Never include `dev-projects/` in the URL path.

## dev-projects in worktrees

`elements/dev-projects/` is gitignored. Worktrees would only have committed stubs without the full asset/src tree.

`create-worktree` sets `DEV_PROJECTS_HOST` in the worktree's `elements/.env` to point at main's dev-projects. The `docker-compose.yaml` dev-projects service mounts this path over `/packages/dev-projects`, so the worktree's dev server always has the full file tree from main.

## Troubleshooting

- **Port conflict**: two branches hashed to same offset. Extremely unlikely with cksum/200 slots but possible. Remove one worktree and recreate.
- **Orphaned containers**: if `remove-worktree` fails mid-cleanup, use `docker rm -f` on containers matching `<branch>` in name.
- **Stale template**: run `scripts/update-template-db` to refresh from current main DB state.
- **Missing web service after upgrade**: upgrade script now starts runner + npm install before other services. If using old worktree scripts, `git merge main` into the worktree branch.
