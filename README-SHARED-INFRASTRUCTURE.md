# Shared Infrastructure for Worktrees

## Overview

The monorepo uses shared Docker infrastructure to efficiently support multiple worktrees:

- **Single Traefik instance** - Routes traffic to all worktrees based on domain
- **Single PostgreSQL instance** - Hosts separate databases for each worktree

## Architecture

```
editframe (Docker Compose project)
├── traefik          # Shared reverse proxy for all worktrees
│   ├── Port 7777    # Traefik dashboard
│   ├── Port 3000    # Telecine web apps
│   ├── Port 4321    # Elements dev servers
│   └── Port 24678   # Telecine additional services
│
└── postgres         # Shared database server
    ├── Port 5432    # PostgreSQL
    ├── telecine-main        # Main worktree database
    ├── telecine-feat-auth   # Feature worktree database
    └── telecine-*           # Other worktree databases
```

## Worktree Databases

Each worktree gets its own PostgreSQL database:
- **Main worktree**: `telecine-main`
- **Feature worktrees**: `telecine-<branch-name>` (sanitized)

Example:
```bash
# Worktree on branch "feature/user-auth"
# → Database name: "telecine-feature-user-auth"

# Worktree on branch "fix/CSS-123-styling"
# → Database name: "telecine-fix-css-123-styling"
```

## Starting Services

### Start Shared Infrastructure

```bash
# From monorepo root
./scripts/start-shared

# This starts:
# - Traefik (routing)
# - PostgreSQL (databases)
```

### Start Telecine Worktree Services

```bash
# From monorepo root or telecine directory
./scripts/start

# This will:
# 1. Start shared infrastructure if not running
# 2. Create worktree database if it doesn't exist
# 3. Start telecine services for current worktree
# 4. Run migrations on the worktree database
```

### Stop Shared Infrastructure

```bash
# From monorepo root
./scripts/stop-shared

# ⚠️ Warning: This will stop Traefik and PostgreSQL for ALL worktrees
```

## Configuration

### Environment Variables

The `telecine/scripts/worktree-config` script exports these variables:

- `WORKTREE_DATABASE` - Database name for this worktree
- `WORKTREE_DOMAIN` - Domain for this worktree (e.g., `main.localhost`, `feat-auth.localhost`)
- `WORKTREE_DOCKER_PROJECT_NAME` - Docker Compose project name
- `WORKTREE_ID` - Worktree identifier (sanitized branch name)

### Database Connection Strings

Services automatically use the worktree-specific database:

```bash
# Web service
DATABASE_URL=postgres://postgres:postgrespassword@editframe-postgres:5432/${WORKTREE_DATABASE}

# Hasura/GraphQL
HASURA_GRAPHQL_DATABASE_URL=postgres://postgres:postgrespassword@editframe-postgres:5432/${WORKTREE_DATABASE}
```

## Traefik Routing

Each worktree service registers with Traefik using labels:

```yaml
labels:
  traefik.enable: true
  traefik.http.routers.web-${WORKTREE_ID}.rule: Host(`${WORKTREE_DOMAIN}`)
  traefik.http.routers.web-${WORKTREE_ID}.entrypoints: web
  traefik.http.services.web-${WORKTREE_ID}.loadbalancer.server.port: 3000
```

Example URLs:
- Main worktree: `http://main.localhost:3000`
- Feature worktree: `http://feat-auth.localhost:3000`

## Database Management

### Create Worktree Database

```bash
# Automatically created by scripts/docker-compose
# Or manually:
./scripts/create-worktree-database
```

### List Worktree Databases

```bash
docker exec -it editframe-postgres psql -U postgres -c "\l" | grep telecine
```

### Connect to Worktree Database

```bash
# From host
docker exec -it editframe-postgres psql -U postgres -d telecine-main

# Or from IDE (e.g., Postico, DataGrip)
# Host: localhost
# Port: 5432
# User: postgres
# Password: postgrespassword
# Database: telecine-main (or telecine-<branch-name>)
```

### Drop Worktree Database

```bash
# When removing a worktree
docker exec -it editframe-postgres psql -U postgres -c 'DROP DATABASE "telecine-<branch-name>";'
```

## Networking

All worktree services connect to the shared `editframe-shared` network:

```yaml
networks:
  traefik-shared:
    name: editframe-shared
    external: true
  default:
    name: ${WORKTREE_DOCKER_PROJECT_NAME}_default
```

This allows:
- Services within a worktree to communicate via default network
- All worktrees to reach shared Traefik and PostgreSQL via `editframe-shared`
- Isolation between worktree services (they don't see each other)

## Troubleshooting

### Shared infrastructure not starting

```bash
# Check if docker-compose.yaml exists
ls -la docker-compose.yaml

# Check Docker status
docker ps | grep editframe

# Restart shared infrastructure
./scripts/stop-shared
./scripts/start-shared
```

### Database connection errors

```bash
# Check if PostgreSQL is running
docker ps | grep editframe-postgres

# Check if database exists
docker exec editframe-postgres psql -U postgres -tAc "SELECT datname FROM pg_database WHERE datname LIKE 'telecine-%';"

# Create missing database
./scripts/create-worktree-database
```

### Traefik routing not working

```bash
# Check Traefik dashboard
open http://localhost:7777

# Verify service registration
docker inspect <container> | grep -A 20 "Labels"

# Check network connectivity
docker exec <container> ping editframe-traefik
```

### Port conflicts

If ports 3000, 4321, 5432, or 7777 are in use:

```bash
# Find what's using the port
lsof -i :3000  # or :4321, :5432, :7777

# Stop conflicting service
docker stop <container>

# Or use different ports in docker-compose.yaml
```

## Migration from Old Setup

The old setup had:
- Traefik in each worktree (`telecine/docker-compose.yaml`)
- PostgreSQL in each worktree (`telecine/services/dev-postgres/`)
- Network name: `telecine-traefik`

New setup has:
- Traefik at monorepo root (`docker-compose.yaml`)
- PostgreSQL at monorepo root (`docker-compose.yaml`)
- Network name: `editframe-shared`

To migrate:

```bash
# 1. Stop all worktree services
cd telecine && ./scripts/docker-compose down

# 2. Stop old Traefik/PostgreSQL if running
docker stop $(docker ps -q --filter "name=telecine_traefik")
docker stop $(docker ps -q --filter "name=telecine_postgres")

# 3. Remove old network
docker network rm telecine-traefik

# 4. Start new shared infrastructure
./scripts/start-shared

# 5. Start worktree services
cd telecine && ./scripts/start
```

## Benefits

✅ **Resource Efficiency**: One Traefik and one PostgreSQL for all worktrees instead of N+1

✅ **Simplified Management**: Single place to manage routing and databases

✅ **Faster Worktree Creation**: No need to wait for PostgreSQL to initialize

✅ **Better Isolation**: Each worktree has its own database but shares infrastructure

✅ **Consistent Routing**: All worktrees use the same Traefik instance

✅ **Easy Database Access**: All worktree databases accessible from one PostgreSQL instance

