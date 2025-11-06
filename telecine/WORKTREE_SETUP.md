# Worktree Docker Environment Setup

This document explains how to verify and use the worktree-aware Docker environment setup.

## Overview

The setup enables isolated Docker Compose environments for each git worktree, with domain-based routing through a shared Traefik instance. Each worktree gets:

- **Unique domain**: `<branch-name>.localhost` for all worktrees (e.g., `feature-auth.localhost`, `main.localhost`)
- **Isolated Docker project**: `telecine-<branch-name>` or `telecine` for main
- **Shared Traefik**: Single entrypoint on port 3000 for all worktrees
- **Domain-based routing**: Access services via `http://<branch-name>.localhost:3000` (auto-resolves on macOS)

## Quick Verification

Run the verification script:

```bash
cd telecine
./scripts/verify-worktree-setup
```

This will:
- ✅ Verify worktree-config script loads correctly
- ✅ Display detected configuration
- ✅ Check required environment variables
- ✅ Verify shared Traefik network exists (or will be created)
- ✅ Validate docker-compose configuration
- ✅ Check domain configuration

## Manual Testing Steps

### 1. Test Main Worktree

```bash
# In main worktree (main/master branch)
cd telecine
./scripts/verify-worktree-setup

# Should show:
#   Domain: main.localhost
#   Docker Project: telecine
#   Docker Network: telecine_default

# Start services
./scripts/start

# Verify Traefik is running
docker ps | grep traefik

# Access services (main.localhost auto-resolves on macOS)
open http://main.localhost:3000
```

### 2. Create and Test a Worktree

```bash
# Create a new worktree for a feature branch
cd /Users/collin/Editframe
git worktree add ../telecine-feature-auth feature-auth
cd ../telecine-feature-auth

# Verify worktree configuration
./scripts/verify-worktree-setup

# Should show:
#   Branch: feature-auth
#   Domain: feature-auth.localhost
#   Docker Project: telecine-feature-auth
#   Docker Network: telecine-feature-auth_default

# Start services (Traefik should already be running from main worktree)
./scripts/start

# Verify services are running
docker ps | grep telecine-feature-auth

# Access services via domain (auto-resolves on macOS)
open http://feature-auth.localhost:3000
```

### 3. Verify Domain Resolution

```bash
# Test domain resolution (all .localhost domains auto-resolve on macOS)
ping main.localhost
# Should resolve to 127.0.0.1 automatically

ping feature-auth.localhost
# Should also resolve to 127.0.0.1 automatically
```

### 4. Verify Network Isolation

```bash
# In main worktree
docker network ls | grep telecine

# Should see:
# - telecine-traefik (shared network)
# - telecine_default (main worktree network)

# In worktree
docker network ls | grep telecine

# Should see:
# - telecine-traefik (shared network)
# - telecine-feature-auth_default (worktree network)

# Verify services are isolated
docker ps --filter "network=telecine_default"      # Main worktree services
docker ps --filter "network=telecine-feature-auth_default"  # Worktree services
```

### 5. Verify Traefik Routing

```bash
# Check Traefik dashboard
open http://localhost:7777

# Check routers
curl http://localhost:7777/api/http/routers | jq '.[] | select(.name | contains("web"))'

# Should see routers for both:
# - main.localhost (main worktree)
# - feature-auth.localhost (worktree)
```

## Cursor Worktree Support

### How It Works

Cursor's worktree support automatically creates git worktrees when you create a new branch or task. The Docker setup is **fully automated** and works seamlessly:

1. **Cursor creates worktree**: When you create a branch/task in Cursor, it creates a git worktree
2. **Automatic detection**: Our scripts automatically detect the worktree context via `git branch --show-current`
3. **Domain assignment**: The branch name is sanitized and used as the domain (e.g., `feature-auth` → `feature-auth.localhost`)
4. **Isolated environment**: Each worktree gets its own Docker project namespace
5. **Shared routing**: All worktrees route through the same Traefik instance on port 3000

### Cursor Workflow

```
1. Cursor creates worktree for branch "feature-auth"
   └─> Worktree directory: ../telecine-feature-auth

2. You run: ./scripts/start
   └─> worktree-config detects branch: "feature-auth"
   └─> Sets WORKTREE_DOMAIN="feature-auth.localhost"
   └─> Sets WORKTREE_DOCKER_PROJECT_NAME="telecine-feature-auth"
   └─> docker-compose uses project name for isolation

3. Services start with labels:
   └─> traefik.http.routers.web.rule: Host(`feature-auth.localhost`)
   └─> Traefik (running in main worktree) discovers and routes

4. Access at: http://feature-auth.localhost:3000
   └─> macOS automatically resolves .localhost domains to 127.0.0.1
   └─> Traefik routes to correct worktree's services
```

### No Additional Configuration Needed

The setup is **entirely automated**. Cursor can:
- ✅ Create worktrees automatically
- ✅ Use existing startup scripts (`start`, `soft-start`)
- ✅ Work without any manual configuration
- ✅ Access services via semantic domain names

### Verifying Cursor Integration

```bash
# After Cursor creates a worktree, verify it works:
cd <worktree-directory>
./scripts/verify-worktree-setup

# Start services (will use worktree-specific configuration automatically)
./scripts/start

# Check domain is accessible
curl -H "Host: <branch-name>.localhost" http://localhost:3000
```

## Troubleshooting

### Domain Not Resolving

**Problem**: `ping feature-auth.localhost` fails

**Solution**:
```bash
# .localhost domains should auto-resolve on macOS
# If not working, flush DNS cache:
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder

# Then test again:
ping feature-auth.localhost
```

### Traefik Not Routing

**Problem**: Services not accessible via domain

**Check**:
```bash
# Verify Traefik is running
docker ps | grep traefik

# Verify services are on shared network
docker inspect <service-container> | jq '.[0].NetworkSettings.Networks | keys'

# Should include: "telecine-traefik"

# Check Traefik logs
docker logs <traefik-container>
```

### Port Conflicts

**Problem**: Port 3000 already in use

**Solution**: Only one Traefik instance should run (in main worktree). Worktrees don't start Traefik:
```bash
# Verify only one Traefik is running
docker ps | grep traefik | wc -l
# Should be 1

# If multiple, stop extra instances
docker stop <extra-traefik-container>
```

### Network Not Found

**Problem**: `network telecine-traefik not found`

**Solution**: The script creates it automatically, but you can create manually:
```bash
docker network create telecine-traefik
```

## Environment Variables

The following variables are automatically set by `scripts/worktree-config`:

- `WORKTREE_BRANCH`: Current git branch name
- `WORKTREE_DOMAIN`: Domain for this worktree (e.g., `feature-auth.localhost` or `main.localhost`)
- `WORKTREE_DOCKER_PROJECT_NAME`: Docker Compose project name
- `WORKTREE_DOCKER_NETWORK_NAME`: Docker network name
- `WORKTREE_ID`: Sanitized branch name (for reference)

These are exported and available to all scripts that source `worktree-config`.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Single Traefik Instance                  │
│                    (Port 3000, Main Worktree)                │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Shared Network: telecine-traefik               │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
         │                    │                    │
    ┌────▼────┐          ┌────▼────┐          ┌────▼────┐
    │ Main    │          │ WT-1    │          │ WT-2    │
    │ Worktree│          │         │          │         │
    │         │          │         │          │         │
    │main.localhost│     │feature- │         │bugfix-  │
    │         │         │auth.localhost│     │123.localhost│
    └─────────┘          └─────────┘          └─────────┘
         │                    │                    │
    ┌────▼────┐          ┌────▼────┐          ┌────▼────┐
    │telecine │          │telecine-│          │telecine-│
    │_default │          │feature- │          │bugfix-  │
    │network  │          │auth_    │          │123_     │
    │         │          │default  │          │default  │
    └─────────┘          └─────────┘          └─────────┘
```

Each worktree has:
- **Isolated network**: For inter-service communication
- **Shared network**: For Traefik routing
- **Unique domain**: For external access
- **Isolated project**: For Docker resource management

## Elements Integration

The elements project is integrated into the worktree routing system, allowing dev servers to be accessed via worktree-specific domains.

### Elements Dev Server Routing

Elements dev servers are accessible through Traefik using a dedicated entrypoint:

- **Dev Server URL**: `http://<branch-name>.localhost:4321`
- **Traefik Entrypoint**: `elements` (port 4321)
- **Network**: Joins shared `telecine-traefik` network for routing
- **Service**: `dev-projects` service in elements docker-compose

### Starting Elements Services

```bash
cd elements
./scripts/start
```

This starts (via process-compose):
1. **Docker Compose runner** - Test infrastructure
2. **Dev projects server** - Development server (routed through Traefik)

**Note on Host Chrome**: The `host-chrome` process needs to run on the macOS host (not in the dev container) to access the system Chrome browser. If running from a dev container, start host services manually on the macOS host:

```bash
# On macOS host (outside dev container)
./scripts/start-host
```

Or from the elements directory:
```bash
cd elements
npx tsx scripts/start-host-chrome.ts
```

All worktrees will share the same host-chrome instance. The process-compose dependency on host-chrome is optional (`required: false`), so services will start even if host-chrome is already running externally.

### Verification

```bash
cd elements
./scripts/verify-worktree-setup
```

This verifies:
- Worktree configuration is loaded correctly
- Traefik network exists and is accessible
- Docker Compose configuration is valid
- Traefik labels are present on dev-projects service
- Domain resolution works (macOS)

### Accessing Elements Dev Server

After starting services, access the dev server at:
- **Main worktree**: `http://main.localhost:4321`
- **Feature branch**: `http://feature-name.localhost:4321`

### Prerequisites

1. **Traefik must be running** in telecine main worktree with port 4321 entrypoint configured
2. **Shared network** `telecine-traefik` must exist (created automatically when Traefik starts)
3. **Dev server must bind to 0.0.0.0** inside container (not just localhost) for Traefik access

### Troubleshooting Elements

**Dev server not accessible via domain:**

```bash
# Verify Traefik is running with port 4321
docker ps | grep traefik
docker port <traefik-container> | grep 4321

# Check Traefik has elements entrypoint
docker logs <traefik-container> | grep elements

# Verify dev-projects service is on shared network
docker inspect <dev-projects-container> | jq '.[0].NetworkSettings.Networks | keys'
# Should include: "telecine-traefik"
```

**Port 4321 conflicts:**

Only one dev-projects service should be running per worktree. Check for conflicts:
```bash
docker ps | grep dev-projects
# Stop extra instances if needed
```

**Traefik not routing to elements:**

```bash
# Check Traefik dashboard for routers
open http://localhost:7777
# Look for elements-dev router

# Check Traefik logs
docker logs <traefik-container> | grep elements
```

