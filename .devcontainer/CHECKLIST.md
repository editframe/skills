# Pre-Devcontainer Checklist

Before reopening in a devcontainer, verify:

## ✅ Required Setup

- [x] **Docker installed and running**
  - Check: `docker --version` should work
  - Status: ✅ Docker available

- [x] **Devcontainer files exist**
  - `.devcontainer/devcontainer.json` ✅
  - `docker-compose.devcontainer.yaml` ✅
  - `.devcontainer/post-create.sh` ✅ (executable)

- [x] **Docker socket accessible**
  - The devcontainer will mount `/var/run/docker.sock` from host
  - Ensure Docker Desktop is running (if on macOS/Windows)

## ⚠️ Optional but Recommended

- [ ] **Create `telecine/.env` file** (if needed for services)
  - The devcontainer itself doesn't require `.env`
  - Services started via `telecine/scripts/start` will use `.env`
  - Can create it after opening devcontainer if needed
  - Example: Copy from `telecine/.test-env` or `telecine/.playwright-env`

- [ ] **Verify worktree setup** (if using worktrees)
  - Run: `cd telecine && . scripts/worktree-config && echo $WORKTREE_DOMAIN`
  - Should show: `main.localhost` (main) or `<branch>.localhost` (worktree)

## 🚀 Ready to Open

1. **Open in Dev Container**:
   - VS Code/Cursor: "Reopen in Container" or "Dev Containers: Reopen in Container"
   - First build will take 5-10 minutes (downloads base image, installs dependencies)

2. **After container starts**:
   ```bash
   # Verify Docker access
   docker ps
   
   # Verify worktree detection
   cd telecine && . scripts/worktree-config && echo "Domain: $WORKTREE_DOMAIN"
   
   # Start services (if needed)
   cd telecine && ./scripts/start
   ```

## 🔧 Troubleshooting

If the devcontainer fails to start:

1. **Check Docker is running**: `docker ps`
2. **Check Docker socket**: `ls -la /var/run/docker.sock` (Linux) or verify Docker Desktop is running
3. **Rebuild**: Command Palette → "Dev Containers: Rebuild Container"
4. **Check logs**: View → Output → Select "Dev Containers" from dropdown

## 📝 Notes

- The devcontainer provides the development environment only
- Services (postgres, valkey, etc.) are started separately via `telecine/scripts/start`
- Each worktree gets isolated services via Docker Compose project names
- Docker socket mounting allows devcontainer to manage containers on host








