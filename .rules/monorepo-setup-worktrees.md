---
description: git worktrees, git worktree setup, git worktree configuration, branching work syncing branches
alwaysApply: false
---
# Monorepo Worktree Setup

## Worktree Setup

### Telecine Worktrees

The telecine project uses git worktrees for branch isolation. Each worktree:
- Has its own directory (e.g., `../telecine-feature-auth` for branch `feature-auth`)
- Gets a unique domain based on branch name (e.g., `feature-auth.localhost`)
- Uses isolated Docker Compose project names (e.g., `telecine-feature-auth`)
- Shares a common Traefik instance for routing

**Worktree Configuration Script**: `telecine/scripts/worktree-config`
- Detects current branch and worktree context
- Exports environment variables: `WORKTREE_BRANCH`, `WORKTREE_DOMAIN`, `WORKTREE_DOCKER_PROJECT_NAME`, `WORKTREE_DOCKER_NETWORK_NAME`
- Must be sourced: `. scripts/worktree-config`

**Documentation**: See `telecine/WORKTREE_SETUP.md` for detailed worktree setup and Docker environment configuration.

### Elements Worktrees

The elements project also uses git worktrees with similar structure:
- Worktrees get isolated Docker environments
- Docker project names: `ef-elements` (main) or `ef-elements-<branch-name>` (worktrees)
- Unique domains: `main.localhost` or `<branch-name>.localhost`
- Dev servers are routed through shared Traefik instance on port 4321
- Accessible at `http://<branch-name>.localhost:4321`

**Worktree Configuration Script**: `elements/scripts/worktree-config`
- Same structure as telecine's worktree-config
- Exports similar environment variables for elements-specific configuration

**Elements Services**: Managed via `process-compose`:
- `compose`: Docker Compose runner service for tests
- `dev-projects`: Development server (routed through Traefik)
- `host-chrome`: Playwright browser server (must run on macOS host, shared across all worktrees)

### Creating Worktrees

When creating worktrees for telecine or elements:

```bash
# Create worktree for telecine branch
git worktree add ../telecine-<branch-name> <branch-name>

# Create worktree for elements branch  
git worktree add ../elements-<branch-name> <branch-name>
```

### Dev Examples and Worktrees

When working in a worktree and creating new dev examples (e.g., in `elements/dev-projects/`), these files should be committed and merged into main along with the feature work:

1. **Create dev examples** in your worktree as needed for development and testing
2. **Commit dev examples** to your feature branch (use `git add -f` if `dev-projects/` is in `.gitignore`)
3. **Merge to main** - dev examples are included in the merge along with feature code
4. **Dev examples stay in main** - they become part of the shared development examples

**Example workflow:**
```bash
# In worktree, create a new dev example
cd elements/dev-projects
# Create your-example.html

# Force add if dev-projects is ignored
git add -f elements/dev-projects/your-example.html
git commit -m "feat: add your-example.html dev example"

# Merge to main (dev example included)
cd /path/to/main/worktree
git merge feat/your-feature
```

**Note**: While `elements/dev-projects/` may be in `.gitignore` for local development, important dev examples that demonstrate features should be force-added and committed to main so they're available to all developers.
