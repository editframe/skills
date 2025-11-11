# Migration to Shared Infrastructure

## Current State

You currently have multiple worktree-specific Traefik and PostgreSQL containers running:

```bash
# Main worktree
telecine-traefik-1
telecine-postgres-1

# Payments worktree  
telecine-payments-postgres-1

# Motion-designer worktree
telecine-motion-designer-postgres-1
```

Each worktree has its own isolated database server, which consumes significant resources.

## New Architecture

The new shared infrastructure uses:
- **One Traefik container** (`editframe-traefik`) for all worktrees
- **One PostgreSQL container** (`editframe-postgres`) with separate databases per worktree

## Migration Steps

### 1. Stop All Worktree Services

```bash
cd /Users/collin/Editframe/monorepo

# Stop main worktree
cd telecine
./scripts/docker-compose down
cd ..

# Stop other worktrees (repeat for each)
cd ../telecine-payments  # or wherever your worktrees are
./scripts/docker-compose down
cd ..

cd ../telecine-motion-designer
./scripts/docker-compose down
cd ..
```

### 2. Backup Your Databases (IMPORTANT!)

Before removing the old PostgreSQL containers, backup your databases:

```bash
# Backup main worktree database
docker exec telecine-postgres-1 pg_dump -U postgres telecine-dev > /tmp/backup-main.sql

# Backup payments worktree database
docker exec telecine-payments-postgres-1 pg_dump -U postgres telecine-dev > /tmp/backup-payments.sql

# Backup motion-designer worktree database
docker exec telecine-motion-designer-postgres-1 pg_dump -U postgres telecine-dev > /tmp/backup-motion-designer.sql
```

### 3. Remove Old Docker Resources

```bash
cd /Users/collin/Editframe/monorepo

# Remove old Traefik network
docker network rm telecine-traefik 2>/dev/null || true

# Stop and remove all telecine containers
docker stop $(docker ps -q --filter "name=telecine")
docker rm $(docker ps -aq --filter "name=telecine")

# Optional: Remove volumes if you want to start fresh (DANGEROUS - data loss!)
# docker volume prune -f
```

### 4. Update .env Files

Each worktree's `.env` file needs to be updated:

**Main worktree** (`telecine/.env`):
```bash
# Change this:
DB_NAME=telecine-main

# To this:
DB_NAME=telecine-main
```

**Other worktrees** (e.g., `../telecine-payments/.env`):
```bash
# Change this:
DB_NAME=telecine-main

# To this:
DB_NAME=telecine-payments  # Match the worktree name
```

### 5. Start Shared Infrastructure

```bash
cd /Users/collin/Editframe/monorepo
./scripts/start-shared
```

You should see:
```
✅ Shared infrastructure running:
   - Traefik dashboard: http://localhost:7777
   - PostgreSQL: localhost:5432
```

### 6. Restore Databases

```bash
# Restore main worktree database
cat /tmp/backup-main.sql | docker exec -i editframe-postgres psql -U postgres -d telecine-main

# Restore payments worktree database
cat /tmp/backup-payments.sql | docker exec -i editframe-postgres psql -U postgres -d telecine-payments

# Restore motion-designer worktree database
cat /tmp/backup-motion-designer.sql | docker exec -i editframe-postgres psql -U postgres -d telecine-motion-designer
```

### 7. Start Each Worktree

```bash
# Main worktree
cd /Users/collin/Editframe/monorepo/telecine
./scripts/start

# Payments worktree
cd /Users/collin/Editframe/monorepo/../telecine-payments
./scripts/start

# Motion-designer worktree
cd /Users/collin/Editframe/monorepo/../telecine-motion-designer
./scripts/start
```

## Verification

### Check Shared Infrastructure

```bash
# Check containers
docker ps | grep editframe

# Should show:
# editframe-traefik
# editframe-postgres

# Check databases
docker exec editframe-postgres psql -U postgres -c "\l" | grep telecine

# Should show:
# telecine-main
# telecine-payments
# telecine-motion-designer
```

### Check Worktree Services

```bash
# Check main worktree
docker ps | grep "^telecine-"

# Check payments worktree
docker ps | grep "^telecine-payments-"

# Check motion-designer worktree
docker ps | grep "^telecine-motion-designer-"
```

### Test Web Access

- Main: http://main.localhost:3000
- Payments: http://payments.localhost:3000
- Motion-designer: http://motion-designer.localhost:3000

### Check Traefik Dashboard

Open http://localhost:7777 and verify all worktrees are registered.

## Rollback (If Needed)

If something goes wrong, you can rollback:

```bash
# Stop shared infrastructure
cd /Users/collin/Editframe/monorepo
./scripts/stop-shared

# Restore old network
docker network create telecine-traefik

# Start each worktree independently
cd telecine
docker compose --project-name telecine up -d
```

## Benefits After Migration

✅ **Resource Savings**: 1 PostgreSQL instead of 3+ (saves ~300MB RAM per worktree)

✅ **Faster Worktree Creation**: No waiting for PostgreSQL to initialize

✅ **Centralized Management**: One place to manage routing and databases

✅ **Easier Database Access**: All worktree databases accessible from one connection

✅ **Simplified Configuration**: Less Docker networking complexity

## Troubleshooting

### Port 5432 already in use

```bash
# Find what's using it
lsof -i :5432

# Or check docker
docker ps --filter "publish=5432"

# Stop the conflicting container
docker stop <container-name>
```

### Database doesn't exist

```bash
# Create it manually
docker exec editframe-postgres psql -U postgres -c 'CREATE DATABASE "telecine-<branch-name>";'
```

### Can't connect to shared PostgreSQL

```bash
# Check if container is running
docker ps | grep editframe-postgres

# Check logs
docker logs editframe-postgres

# Restart if needed
cd /Users/collin/Editframe/monorepo
./scripts/stop-shared
./scripts/start-shared
```

### Traefik not routing correctly

```bash
# Check Traefik logs
docker logs editframe-traefik

# Verify service labels
docker inspect <service-container> | grep -A 10 "Labels"

# Check network
docker network inspect editframe-shared
```

