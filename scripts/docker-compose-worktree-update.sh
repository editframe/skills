#!/bin/bash
# Update TELECINE_ROOT to use worktree paths

PROJECT_ROOT="$SCRIPT_DIR/.."
WORKTREE_ROOT=$(cd "$PROJECT_ROOT" && git rev-parse --show-toplevel 2>/dev/null || echo "$PROJECT_ROOT")

# Determine telecine root path
if [ -d "$WORKTREE_ROOT/telecine" ]; then
    TELECINE_ROOT="$WORKTREE_ROOT/telecine"
else
    TELECINE_ROOT="$WORKTREE_ROOT"
fi

export TELECINE_ROOT
