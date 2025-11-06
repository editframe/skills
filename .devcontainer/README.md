# Dev Container Setup

This monorepo includes a dev container configuration that provides a unified development environment for both `telecine/` and `elements/` subtrees. The dev container works seamlessly with the worktree-aware Docker setup.

## Quick Start

1. **Open in Dev Container**:
   - Open the folder in VS Code/Cursor
   - When prompted, click "Reopen in Container"
   - Or use Command Palette: "Dev Containers: Reopen in Container"

2. **The dev container will automatically**:
   - Detect worktree context (branch name, domain, Docker project)
   - Install dependencies in both `telecine/` and `elements/`
   - Configure the workspace for TypeScript and Biome

3. **Start services** (after container is running):
   ```bash
   cd telecine
   ./scripts/start
   ```

## Architecture

The dev container provides **only the development environment**. Services (PostgreSQL, Valkey, MailHog, GraphQL Engine, Traefik) are managed by `telecine/scripts/docker-compose`, which:

- Automatically detects worktree context via `telecine/scripts/worktree-config`
- Creates isolated Docker projects per worktree (e.g., `telecine-feature-auth`)
- Uses domain-based routing (e.g., `feature-auth.localhost`)
- Connects to shared Traefik network for routing

### Docker-in-Docker? No!

The devcontainer uses **Docker socket mounting** (not Docker-in-Docker):

- **Docker socket mounted**: `/var/run/docker.sock` is mounted from host into devcontainer
- **Docker CLI installed**: The devcontainer has `docker` and `docker compose` CLI tools
- **Host daemon access**: When you run `telecine/scripts/docker-compose` from inside the devcontainer, it creates containers on the **host Docker daemon**
- **Worktree isolation**: Each worktree's services are isolated via `--project-name` (Docker Compose project names)
- **No conflicts**: Different worktrees create different projects (e.g., `telecine-feature-auth` vs `telecine-bugfix-123`)

This means:
- ✅ No docker-in-docker complexity
- ✅ All containers run on host (better performance)
- ✅ Worktree isolation via project names
- ✅ Can run multiple worktrees simultaneously

**Services available** (managed by telecine docker-compose):
- **PostgreSQL** (port 6432) - Database
- **Valkey** (port 6379) - Redis-compatible cache
- **MailHog** (ports 1025, 8025) - Email testing
- **GraphQL Engine** (port 8080) - Hasura GraphQL API
- **Traefik** (port 7777) - Reverse proxy (main worktree only)

## Working with Worktrees

The dev container is **worktree-aware**. When you open a worktree:

1. The container detects the branch name
2. Services are accessible at `http://<branch-name>.localhost:3000`
3. Each worktree gets its own isolated Docker project
4. Services don't conflict between worktrees

### Example: Feature Branch Worktree

```bash
# In dev container
cd telecine
./scripts/worktree-config  # Source to see detected config
# Output: WORKTREE_DOMAIN=feature-auth.localhost
#         WORKTREE_DOCKER_PROJECT_NAME=telecine-feature-auth

./scripts/start  # Start services for this worktree
# Services accessible at: http://feature-auth.localhost:3000
```

## Working with Subtrees

### Telecine
```bash
cd telecine
./scripts/start        # Start telecine services (worktree-aware)
./scripts/test         # Run tests
```

### Elements
```bash
cd elements
npm run test         # Run tests
npm run browsertest  # Run browser tests
```

## Docker Compose

Services are managed through the worktree-aware scripts:

```bash
# From monorepo root (delegates to telecine)
./scripts/docker-compose up -d

# Or directly from telecine
cd telecine
./scripts/docker-compose up -d
```

The docker-compose script automatically:
- Sources `worktree-config` to detect context
- Uses worktree-specific project names
- Connects to shared Traefik network
- Handles main worktree vs worktree differences

## Troubleshooting

### Docker Socket Access Issues
If docker commands fail in the devcontainer:
```bash
# Verify Docker socket is accessible
ls -la /var/run/docker.sock

# Check docker group membership
groups  # Should include 'docker'

# Verify Docker CLI works
docker ps
```

### Network Connection Issues
If the dev container can't connect to services:
```bash
# Ensure Traefik network exists (created automatically by docker-compose script)
docker network create telecine-traefik

# Verify services are running
cd telecine && ./scripts/docker-compose ps
```

### Dependencies Not Installing
If dependencies fail to install:
```bash
# In the dev container
cd telecine && rm -rf node_modules && npm install
cd ../elements && rm -rf node_modules && npm install
```

### TypeScript Errors
Make sure you're using the workspace TypeScript version:
1. Open any `.ts` file
2. Click on the TypeScript version in the status bar
3. Select "Use Workspace Version"

### Worktree Detection Issues
If worktree detection fails:
```bash
cd telecine
. scripts/worktree-config
echo "Domain: $WORKTREE_DOMAIN"
echo "Project: $WORKTREE_DOCKER_PROJECT_NAME"
```

## Notes

- The dev container connects to the shared `telecine-traefik` network (created by telecine docker-compose)
- Services are **not** started automatically - use `telecine/scripts/start` after container is running
- Each worktree maintains its own isolated Docker project and network
- Environment variables are loaded from `telecine/.env`
- See `telecine/WORKTREE_SETUP.md` for detailed worktree documentation

