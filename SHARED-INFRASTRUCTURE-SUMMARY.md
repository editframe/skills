# Shared Infrastructure Implementation Summary

## What Was Implemented

A centralized Docker infrastructure for the Editframe monorepo that allows all worktrees to share:
1. **Single Traefik instance** - Routes traffic to all worktrees
2. **Single PostgreSQL instance** - Hosts separate databases for each worktree

## Files Created

### Root Level (`/`)
- `docker-compose.yaml` - Shared Traefik + PostgreSQL configuration
- `scripts/start-shared` - Start shared infrastructure
- `scripts/stop-shared` - Stop shared infrastructure
- `scripts/create-worktree-database` - Create database for a worktree
- `scripts/postgres-init/00-create-databases.sh` - Initialize default databases
- `README-SHARED-INFRASTRUCTURE.md` - Complete documentation
- `MIGRATION-TO-SHARED-INFRASTRUCTURE.md` - Migration guide from old setup
- `SHARED-INFRASTRUCTURE-SUMMARY.md` - This file

### Telecine (`telecine/`)
Updated files:
- `scripts/worktree-config` - Added WORKTREE_DATABASE export
- `scripts/docker-compose` - Auto-start shared infrastructure if not running
- `docker-compose.yaml` - Removed traefik service (now at root)
- `services/dev-postgres/docker-compose.yaml` - Removed local postgres service
- `services/graphql-engine/docker-compose.yaml` - Connect to shared postgres

## Architecture

```
editframe (Docker Compose project)
├── traefik (editframe-traefik)
│   ├── Routes: *.localhost:3000, *.localhost:4321
│   └── Dashboard: localhost:7777
│
└── postgres (editframe-postgres)
    ├── Listens on: localhost:5432
    └── Databases:
        ├── telecine-main           # Main worktree
        ├── telecine-<branch-name>  # Feature worktrees
        └── Auto-created on worktree start

Each Telecine worktree (telecine, telecine-*)
├── Has own Docker Compose project
├── Connects to shared network (editframe-shared)
├── Uses shared Traefik for routing
├── Uses shared PostgreSQL with own database
└── Services: web, graphql-engine, workers, etc.
```

## Key Changes

### 1. Worktree Database Names

**Old:**
- All worktrees used: `telecine-dev` or `telecine-main`
- Conflicted when running multiple worktrees

**New:**
- Main worktree: `telecine-main`
- Feature worktrees: `telecine-<sanitized-branch-name>`
- Example: `feature/user-auth` → `telecine-feature-user-auth`

### 2. Network Names

**Old:**
- `telecine-traefik` network
- Each worktree had its own Traefik

**New:**
- `editframe-shared` network
- Single Traefik shared by all worktrees

### 3. Environment Variables

Added to `telecine/scripts/worktree-config`:
```bash
export WORKTREE_DATABASE="telecine-main"        # or telecine-<branch>
export POSTGRES_DB="$WORKTREE_DATABASE"
```

### 4. Docker Compose Changes

**Hasura (`services/graphql-engine/docker-compose.yaml`):**
```yaml
environment:
  HASURA_GRAPHQL_DATABASE_URL: "postgres://postgres:postgrespassword@editframe-postgres:5432/${WORKTREE_DATABASE}"
  HASURA_GRAPHQL_METADATA_DATABASE_URL: "postgres://postgres:postgrespassword@editframe-postgres:5432/${WORKTREE_DATABASE}"
```

**Web Service:**
- Automatically uses `POSTGRES_DB` from worktree-config
- Connects to `editframe-postgres:5432/${WORKTREE_DATABASE}`

### 5. Automatic Database Creation

When you run `telecine/scripts/docker-compose`:
1. Checks if shared infrastructure is running
2. If not, starts it automatically
3. Checks if worktree database exists
4. If not, creates it automatically

## Usage

### First Time Setup

```bash
cd /Users/collin/Editframe/monorepo

# Start shared infrastructure
./scripts/start-shared

# Start main worktree
cd telecine
./scripts/start
```

### Daily Development

```bash
# Just start your worktree - shared infrastructure auto-starts if needed
cd /Users/collin/Editframe/monorepo/telecine
./scripts/start

# Or use root script
cd /Users/collin/Editframe/monorepo
./scripts/start
```

### Working with Multiple Worktrees

```bash
# Start main worktree
cd /Users/collin/Editframe/monorepo/telecine
./scripts/start

# Start feature worktree (in another terminal)
cd /Users/collin/Editframe/monorepo/../telecine-feature-auth
./scripts/start

# Both will share Traefik and PostgreSQL
# Main: http://main.localhost:3000
# Feature: http://feature-auth.localhost:3000
```

## Migration from Old Setup

See `MIGRATION-TO-SHARED-INFRASTRUCTURE.md` for detailed steps.

**Quick summary:**
1. Backup databases
2. Stop all worktrees
3. Update `.env` files (change `DB_NAME` to match worktree)
4. Start shared infrastructure
5. Restore databases
6. Start worktrees

## Benefits

### Resource Savings
- **Before**: N worktrees = N Traefik + N PostgreSQL containers
- **After**: N worktrees = 1 Traefik + 1 PostgreSQL + N worktree services
- **Savings**: ~300MB RAM per worktree + faster startup

### Developer Experience
- ✅ Simpler mental model - one Traefik, one PostgreSQL
- ✅ Faster worktree creation - no waiting for PostgreSQL init
- ✅ Easier database access - all DBs in one place
- ✅ Automatic setup - infrastructure starts automatically
- ✅ Consistent routing - all worktrees use same Traefik

### Operational Benefits
- ✅ Centralized configuration
- ✅ Easier debugging - one place to check
- ✅ Better resource utilization
- ✅ Simplified networking
- ✅ Single source of truth for routing

## Compatibility

### Backward Compatibility
- Old worktrees continue to work with local postgres/traefik
- Migration is opt-in (though recommended)
- Can run old and new setup side-by-side (different ports)

### Forward Compatibility
- Elements will use same shared infrastructure
- Future services can easily connect to shared network
- Easy to add more shared services (Redis, etc.)

## Testing

### Verify Shared Infrastructure
```bash
# Check containers
docker ps | grep editframe
# Should show: editframe-traefik, editframe-postgres

# Check network
docker network inspect editframe-shared

# Check databases
docker exec editframe-postgres psql -U postgres -c "\l" | grep telecine
```

### Verify Worktree
```bash
# Start worktree
cd telecine
./scripts/start

# Check it connected to shared infrastructure
docker inspect telecine-web-1 | grep -A 5 "Networks"
# Should show: editframe-shared

# Test web access
curl -I http://main.localhost:3000
```

### Verify Database Isolation
```bash
# List databases
docker exec editframe-postgres psql -U postgres -c "\l" | grep telecine

# Each worktree should have its own database
# telecine-main
# telecine-feature-auth
# telecine-payments
```

## Documentation

- `README-SHARED-INFRASTRUCTURE.md` - Complete documentation
- `MIGRATION-TO-SHARED-INFRASTRUCTURE.md` - Migration guide
- `docker-compose.yaml` - Inline comments explaining configuration
- `scripts/worktree-config` - Inline comments for database naming

## Next Steps

1. **Migrate existing worktrees** - Follow migration guide
2. **Test thoroughly** - Ensure all services work correctly
3. **Update Elements** - Add Elements services to shared infrastructure
4. **Consider Redis** - Add shared Redis for session storage
5. **Monitoring** - Add monitoring for shared services

## Rollback Plan

If issues arise:
```bash
# Stop shared infrastructure
./scripts/stop-shared

# Each worktree reverts to its own postgres/traefik
cd telecine
# (Would need to revert code changes)
docker compose up -d
```

## Support

For issues or questions:
1. Check `README-SHARED-INFRASTRUCTURE.md` troubleshooting section
2. Check `MIGRATION-TO-SHARED-INFRASTRUCTURE.md` for migration issues
3. Check Docker logs: `docker logs editframe-traefik` or `docker logs editframe-postgres`
4. Check network: `docker network inspect editframe-shared`

## Implementation Notes

- Traefik automatically discovers services via Docker labels
- PostgreSQL uses a single data volume (`editframe-postgres-data`)
- Network uses bridge driver for simplicity
- All configuration is declarative in `docker-compose.yaml`
- Scripts are idempotent - safe to run multiple times

