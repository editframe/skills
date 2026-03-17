#!/usr/bin/env bash
# Shared worktree configuration sourceable by both telecine and elements scripts.
# Must be sourced: . scripts/worktree-config.sh
# Exports environment variables for worktree context.

set -e

# Determine script location
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
PROJECT_ROOT="$SCRIPT_DIR/.."

# Check git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  echo "Error: Not in a git repository" >&2
  return 1 2>/dev/null || exit 1
fi

# Get worktree root
WORKTREE_ROOT=$(git rev-parse --show-toplevel)

# Detect branch name with CI awareness
if [ -n "$GITHUB_ACTIONS" ]; then
  if [ -n "$GITHUB_REF" ] && echo "$GITHUB_REF" | grep -q "^refs/tags/"; then
    BRANCH_NAME="main"
  elif [ -n "$GITHUB_REF_NAME" ]; then
    BRANCH_NAME="$GITHUB_REF_NAME"
  elif [ -n "$GITHUB_REF" ]; then
    BRANCH_NAME=$(echo "$GITHUB_REF" | sed 's|refs/heads/||')
  else
    BRANCH_NAME="main"
  fi
else
  BRANCH_NAME=$(git branch --show-current 2>/dev/null || git symbolic-ref --short HEAD 2>/dev/null)
  if [ -z "$BRANCH_NAME" ]; then
    if [ -n "$CI" ]; then
      BRANCH_NAME="main"
    else
      echo "Error: Could not detect git branch name." >&2
      return 1 2>/dev/null || exit 1
    fi
  fi
fi

# Main worktree detection
IS_MAIN_WORKTREE=false
if [ "$BRANCH_NAME" = "main" ] || [ "$BRANCH_NAME" = "master" ]; then
  IS_MAIN_WORKTREE=true
fi

# Sanitization function
sanitize_branch_name() {
  local name="$1"
  name=$(echo "$name" | tr '[:upper:]' '[:lower:]')
  name=$(echo "$name" | sed 's/[^a-z0-9]/-/g')
  name=$(echo "$name" | sed 's/^-\+//; s/-\+$//')
  name=$(echo "$name" | sed 's/-\+/-/g')
  name=$(echo "$name" | cut -c1-63)
  name=$(echo "$name" | sed 's/-$//')
  if [ -z "$name" ] || ! echo "$name" | grep -q '^[a-z0-9]'; then
    echo "Error: Invalid branch name after sanitization: '$BRANCH_NAME' -> '$name'" >&2
    return 1
  fi
  echo "$name"
}

SANITIZED_BRANCH=$(sanitize_branch_name "$BRANCH_NAME")

# Domain (shared)
if [ "$IS_MAIN_WORKTREE" = true ]; then
  WORKTREE_DOMAIN="main.localhost"
else
  WORKTREE_DOMAIN="${SANITIZED_BRANCH}.localhost"
fi

# Database naming (shared)
if [ "$IS_MAIN_WORKTREE" = true ]; then
  WORKTREE_DATABASE="telecine-main"
else
  WORKTREE_DATABASE="telecine-${SANITIZED_BRANCH}"
fi

# Basic exports
export WORKTREE_BRANCH="$BRANCH_NAME"
export WORKTREE_DOMAIN
export WORKTREE_ID="${SANITIZED_BRANCH:-main}"
export WORKTREE_DATABASE
export POSTGRES_DB="$WORKTREE_DATABASE"
export IS_MAIN_WORKTREE

# Port offset calculation (from telecine)
calculate_port_offset() {
  if [ "$IS_MAIN_WORKTREE" = true ]; then
    echo "0"
    return
  fi
  local hash=$(echo -n "$BRANCH_NAME" | cksum | awk '{print $1}')
  local slot=$(( (hash % 200) + 1 ))
  echo $(( slot * 100 ))
}

PORT_OFFSET=$(calculate_port_offset)

# Port variables (shared, used by both packages)
if [ "$IS_MAIN_WORKTREE" = true ]; then
  export WORKTREE_POSTGRES_PORT=5432
  export WORKTREE_VALKEY_PORT=6379
  export WORKTREE_MAILHOG_SMTP_PORT=1025
  export WORKTREE_MAILHOG_WEB_PORT=8025
  export WORKTREE_PLAYWRIGHT_PORT=4444
  export WORKTREE_TRACING_GRPC_PORT=4317
  export WORKTREE_TRACING_HTTP_PORT=4318
  export WORKTREE_TRACING_SSE_PORT=4319
  export WORKTREE_OTEL_VIEWER_PORT=4320
else
  export WORKTREE_POSTGRES_PORT=$((5432 + PORT_OFFSET))
  export WORKTREE_VALKEY_PORT=$((6379 + PORT_OFFSET))
  export WORKTREE_MAILHOG_SMTP_PORT=$((1025 + PORT_OFFSET))
  export WORKTREE_MAILHOG_WEB_PORT=$((8025 + PORT_OFFSET))
  export WORKTREE_PLAYWRIGHT_PORT=$((4444 + PORT_OFFSET))
  export WORKTREE_TRACING_GRPC_PORT=$((4317 + PORT_OFFSET))
  export WORKTREE_TRACING_HTTP_PORT=$((4318 + PORT_OFFSET))
  export WORKTREE_TRACING_SSE_PORT=$((4319 + PORT_OFFSET))
  export WORKTREE_OTEL_VIEWER_PORT=$((4320 + PORT_OFFSET))
fi
