#!/bin/bash
# Update TELECINE_ROOT to use worktree paths that exist on the host
# For docker-in-docker: paths must exist on the HOST filesystem

PROJECT_ROOT="$SCRIPT_DIR/.."
WORKTREE_ROOT=$(cd "$PROJECT_ROOT" && git rev-parse --show-toplevel 2>/dev/null || echo "$PROJECT_ROOT")

# Check if we're in a worktree under /workspace/.cursor-worktrees
if [[ "$WORKTREE_ROOT" == /workspace/.cursor-worktrees/* ]]; then
    # Worktree is in the host-mounted directory - use it directly
    TELECINE_ROOT="$WORKTREE_ROOT/telecine"
    if [[ ! -d "$TELECINE_ROOT" ]]; then
        TELECINE_ROOT="$WORKTREE_ROOT"
    fi
elif [[ "$WORKTREE_ROOT" == /workspace/* ]]; then
    # Main worktree or worktree directly under /workspace
    TELECINE_ROOT="$WORKTREE_ROOT/telecine"
    if [[ ! -d "$TELECINE_ROOT" ]]; then
        TELECINE_ROOT="$WORKTREE_ROOT"
    fi
elif [[ -d "/workspace/telecine" ]]; then
    # Fallback: use main worktree's telecine
    TELECINE_ROOT="/workspace/telecine"
else
    # Last resort: use current directory (may not work in docker-in-docker)
    TELECINE_ROOT=$(cd "$PROJECT_ROOT" && pwd)
fi

export TELECINE_ROOT
