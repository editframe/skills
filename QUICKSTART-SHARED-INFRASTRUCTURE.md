# Quick Start: Shared Infrastructure

## ⚠️ IMPORTANT: Migration Required

Your current setup has worktrees running with individual PostgreSQL and Traefik containers. To use the new shared infrastructure, you need to migrate.

## Quick Migration (5 minutes)

### 1. Backup Your Databases

```bash
# Backup main worktree
docker exec telecine-postgres-1 pg_dump -U postgres telecine-dev > /tmp/backup-main.sql

# Backup other worktrees (if you have them)
docker exec telecine-payments-postgres-1 pg_dump -U postgres telecine-dev > /tmp/backup-payments.sql 2>/dev/null || echo "No payments worktree"
docker exec telecine-motion-designer-postgres-1 pg_dump -U postgres telecine-dev > /tmp/backup-motion-designer.sql 2>/dev/null || echo "No motion-designer worktree"
```

### 2. Update .env File

Open `telecine/.env` and change:
```bash
# Old
DB_NAME=ef-telecine

# New
DB_NAME=telecine-main
```

### 3. Stop All Services

```bash
cd /Users/collin/Editframe/monorepo/telecine
./scripts/docker-compose down
```

### 4. Start Shared Infrastructure

```bash
cd /Users/collin/Editframe/monorepo
./scripts/start-shared
```

### 5. Restore Database

```bash
# Create and restore main database
docker exec editframe-postgres psql -U postgres -c 'CREATE DATABASE "telecine-main";'
cat /tmp/backup-main.sql | docker exec -i editframe-postgres psql -U postgres -d telecine-main
```

### 6. Start Telecine

```bash
cd /Users/collin/Editframe/monorepo/telecine
./scripts/start
```

## Verify It Works

```bash
# Check shared infrastructure
docker ps | grep editframe
# Should show: editframe-traefik, editframe-postgres

# Check your worktree services
docker ps | grep "^telecine-"
# Should show: telecine-web-1, telecine-graphql-engine-1, etc.

# Test web access
curl -I http://main.localhost:3000
# Should return HTTP 200
```

## What Changed?

### Before
- Each worktree had its own PostgreSQL (300MB RAM each)
- Each worktree had its own Traefik (routing)
- Database name: `telecine-dev` (conflicts between worktrees)

### After
- **One shared PostgreSQL** for all worktrees
- **One shared Traefik** for routing
- Database names: `telecine-main`, `telecine-<branch-name>` (unique per worktree)

### Benefits
- **~300MB RAM saved** per worktree
- **Faster startup** - no PostgreSQL initialization
- **Easier database access** - all DBs in one place
- **Automatic setup** - infrastructure starts when needed

## Daily Usage

After migration, just use your normal workflow:

```bash
# Start services (shared infrastructure auto-starts if needed)
cd /Users/collin/Editframe/monorepo/telecine
./scripts/start

# Or use root script
cd /Users/collin/Editframe/monorepo
./scripts/start
```

## For Multiple Worktrees

Each worktree gets its own database automatically:

```bash
# Main worktree
cd /Users/collin/Editframe/monorepo/telecine
./scripts/start
# → Uses database: telecine-main
# → Available at: http://main.localhost:3000

# Feature worktree
cd /Users/collin/Editframe/monorepo/../telecine-feature-auth
./scripts/start
# → Uses database: telecine-feature-auth
# → Available at: http://feature-auth.localhost:3000
```

## Troubleshooting

### Port 5432 already in use

```bash
# Find what's using it
lsof -i :5432

# It's probably your old postgres - stop all telecine services
cd telecine
./scripts/docker-compose down
```

### Database connection errors

```bash
# Check if shared PostgreSQL is running
docker ps | grep editframe-postgres

# If not, start it
cd /Users/collin/Editframe/monorepo
./scripts/start-shared

# Check if database exists
docker exec editframe-postgres psql -U postgres -c "\l" | grep telecine

# If not, it will be auto-created on next start
```

### Web service can't connect

```bash
# Check if shared infrastructure is running
docker ps | grep editframe

# Restart services
cd /Users/collin/Editframe/monorepo/telecine
./scripts/docker-compose restart web graphql-engine
```

## Need More Help?

- **Complete docs**: `README-SHARED-INFRASTRUCTURE.md`
- **Migration guide**: `MIGRATION-TO-SHARED-INFRASTRUCTURE.md`
- **Implementation details**: `SHARED-INFRASTRUCTURE-SUMMARY.md`

## Rollback (If Needed)

If you need to rollback:

```bash
# Stop shared infrastructure
./scripts/stop-shared

# Revert .env change
# Change DB_NAME back to ef-telecine in telecine/.env

# Start old way (requires code revert)
cd telecine
git revert HEAD  # Revert the shared infrastructure commit
docker compose up -d
```

## Questions?

The new setup is:
✅ **Simpler** - one Traefik, one PostgreSQL
✅ **Faster** - no waiting for PostgreSQL init
✅ **Lighter** - ~300MB RAM saved per worktree
✅ **Automatic** - infrastructure starts when needed

