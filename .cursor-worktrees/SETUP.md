# Cursor Worktrees Setup for Docker-in-Docker

## Problem
When using docker-in-docker, bind mounts require paths that exist on the **host** filesystem, not just inside containers. Cursor's default worktree location (`~/.cursor/worktrees/...`) only exists inside the devcontainer, causing Docker-in-docker bind mounts to fail.

## Solution
Worktrees are now stored in `/workspace/.cursor-worktrees` which:
- Exists on the host at `/Users/collin/Editframe/monorepo/.cursor-worktrees`
- Is mounted into the devcontainer
- Can be bind-mounted by Docker-in-docker

## Configuration

### 1. Devcontainer Mounts
- ✅ `docker-compose.devcontainer.yaml` mounts `./.cursor-worktrees:/workspace/.cursor-worktrees`
- ✅ `.devcontainer/devcontainer.json` includes the mount

### 2. Cursor Configuration
Configure Cursor to create worktrees in `/workspace/.cursor-worktrees`:

**Option A: Workspace Settings** (Recommended)
Create `.vscode/settings.json` or `.cursor/settings.json`:
```json
{
  "git.worktrees.location": "/workspace/.cursor-worktrees"
}
```

**Option B: User Settings**
In Cursor settings, set:
- `git.worktrees.location` to `/workspace/.cursor-worktrees`

### 3. Creating Worktrees
When creating a new worktree, Cursor should now create it in `/workspace/.cursor-worktrees/<branch-name>`, which will be accessible to Docker-in-docker.

## Verification
After rebuilding the devcontainer and creating a worktree:
1. Worktree should be at `/workspace/.cursor-worktrees/<branch-name>/telecine`
2. `scripts/docker-compose` should detect it and use it for bind mounts
3. Runner container should see files at `/app/package.json`
