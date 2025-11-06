#!/bin/bash
set -e

echo "🚀 Setting up monorepo dev container..."

# Source worktree configuration to detect context
echo "🔍 Detecting worktree context..."
cd /workspace/telecine
if [ -f "scripts/worktree-config" ]; then
  . scripts/worktree-config
  echo "   Branch: $WORKTREE_BRANCH"
  echo "   Domain: $WORKTREE_DOMAIN"
  echo "   Docker Project: $WORKTREE_DOCKER_PROJECT_NAME"
fi

# Install dependencies in both subtrees
echo ""
echo "📦 Installing telecine dependencies..."
cd /workspace/telecine
if [ -f "package.json" ]; then
  npm install
fi

echo "📦 Installing elements dependencies..."
cd /workspace/elements
if [ -f "package.json" ]; then
  npm install
fi

cd /workspace

echo ""
echo "✅ Dev container setup complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Start services: cd telecine && ./scripts/start"
echo "   2. Services will be available at: http://${WORKTREE_DOMAIN:-main.localhost}:3000"
echo ""
echo "💡 Note: Services are managed by telecine/scripts/docker-compose which"
echo "   automatically handles worktree isolation. Each worktree gets its own"
echo "   Docker project and network."

