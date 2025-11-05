# Cursor Worktrees Directory

This directory is used for git worktrees created by Cursor. It is mounted into the devcontainer
so that worktree paths exist on the host filesystem, allowing Docker-in-docker to properly bind
mount worktree directories.

Worktrees created here will be accessible at:
- Host: /Users/collin/Editframe/monorepo/.cursor-worktrees/<worktree-name>
- Container: /workspace/.cursor-worktrees/<worktree-name>

This ensures Docker-in-docker can bind mount worktree paths since they exist on the actual host.
