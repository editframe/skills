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

The `telecine/` and `elements/` directories are git subtrees. Changes sync bidirectionally via `git subtree push/pull`.

## Push/Pull Workflows

### Pushing Changes to Remotes

Always use the dedicated scripts. Never run `git push` directly to telecine or elements remotes.

```bash
# Push telecine/ to telecine remote (defaults to main branch)
./scripts/push-telecine

# Push telecine/ to a specific branch
./scripts/push-telecine <branch-name>

# Push telecine/ and wait for deployment action to complete
./scripts/push-telecine --wait

# Push elements/ to elements remote
./scripts/push-elements
./scripts/push-elements --wait

# Push skills/ to skills remote
./scripts/push-skills
```

**How push scripts work:** `git subtree push --prefix=<dir> <remote> <branch>`. This splits the subtree commit history and pushes only the sub-directory tree with proper ancestry, enabling future bidirectional merges.

### Pulling Changes from Remotes

When changes are merged directly to a remote (e.g. via a PR on github.com/editframe/telecine), pull them back using:

```bash
./scripts/pull-telecine
./scripts/pull-elements
```

These run `git subtree pull --prefix=<dir> <remote> main --squash`. Because `push-telecine`/`push-elements` use `git subtree push`, the histories share ancestry and pull is conflict-free for non-overlapping changes.

### Syncing Workflow

The monorepo is the primary working environment:
1. Make changes in the monorepo
2. Commit to monorepo `main`
3. Push to the remote with `./scripts/push-telecine` or `./scripts/push-elements`
4. If a PR was merged directly on the remote, pull back with `./scripts/pull-telecine` or `./scripts/pull-elements`

**Never run `git push telecine ...` or `git push elements ...` directly.** The push scripts handle proper subtree extraction.

### Skills sync

`push-telecine` automatically runs `sync-telecine-skills` before pushing, which rsyncs the `skills/` tree into `telecine/skills/` and commits if changed.
