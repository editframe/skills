---
name: monorepo-setup-git
description: git, git tags, pushing and pulling to repository. Any version control tasks.
---
# Monorepo Git Configuration

## Git Remotes Configuration

The root repository has three remotes configured:
- `telecine`: Points to `git@github.com:editframe/telecine.git`
- `elements`: Points to `git@github.com:editframe/elements.git`
- `skills`: Points to `git@github.com:editframe/skills.git`

These remotes are used for syncing changes to/from the separate repositories.

## Push/Pull Workflows

### Pushing Changes to Remotes

Always use the dedicated push scripts to push changes from the monorepo to sub-repo remotes. Never run `git push` directly to telecine, elements, or skills remotes.

#### Using Push Scripts (Recommended)

```bash
# Push telecine/ directory to telecine remote (defaults to main branch)
./scripts/push-telecine

# Push telecine/ directory to a specific branch
./scripts/push-telecine <branch-name>
# or
./scripts/push-telecine --branch <branch-name>

# Push telecine/ directory and wait for deployment action to complete
./scripts/push-telecine --wait

# Push elements/ directory to elements remote (defaults to main branch)
./scripts/push-elements

# Push elements/ directory to a specific branch
./scripts/push-elements <branch-name>
# or
./scripts/push-elements --branch <branch-name>

# Push elements/ directory and wait for release action to complete
./scripts/push-elements --wait

# Push skills/ directory to skills remote (defaults to main branch)
./scripts/push-skills

# Push skills/ directory to a specific branch
./scripts/push-skills <branch-name>
```

**How the push scripts work:**
1. Fetches the remote branch to get current state
2. Extracts the tree object for the subdirectory from HEAD (`git rev-parse HEAD:<prefix>`)
3. Creates a new commit with that tree, parented on the remote's current HEAD (`git commit-tree`)
4. Pushes the new commit with `--force-with-lease`
5. Skips the push entirely if the remote tree already matches (no-op detection)
6. Optionally waits for GitHub Actions to complete (with `--wait` flag, telecine/elements only)

**Never push directly to sub-repo remotes with `git push`.** The monorepo root tree does not match the sub-repo tree structure. Direct pushes would push the entire monorepo, breaking the sub-repos.

### Pulling Changes from Remotes

To pull changes from the remotes into the monorepo:

```bash
# Fetch from telecine remote
git fetch telecine

# Fetch from elements remote
git fetch elements

# Fetch from skills remote
git fetch skills

# Merge specific branch from remote
git merge telecine/<branch-name>
git merge elements/<branch-name>
git merge skills/<branch-name>
```

### Syncing Between Monorepo and Remotes

The monorepo acts as the primary working repository. Changes should be:
1. Committed in the monorepo
2. Pushed to the appropriate remote using the push scripts (`./scripts/push-telecine`, `./scripts/push-elements`, or `./scripts/push-skills`) when ready
3. Pulled from remotes when syncing upstream changes

**Important**: The monorepo structure means that `telecine/`, `elements/`, and `skills/` directories are part of the root repository, but they should be synced with their respective remote repositories using the push scripts. The push scripts extract only the relevant subdirectory tree, ensuring clean separation between the monorepo and the individual project repositories.
