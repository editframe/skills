#!/bin/bash

# Script to rebuild the development container with FFmpeg 7.1

echo "🎬 Rebuilding development container with FFmpeg 7.1..."

# Stop any running containers
echo "Stopping existing containers..."
docker-compose -f .devcontainer/docker-compose.yml down

# Rebuild the container without cache to ensure fresh FFmpeg build
echo "Rebuilding container (this may take a while as FFmpeg is built from source)..."
docker-compose -f .devcontainer/docker-compose.yml build --no-cache

echo "✅ Container rebuilt successfully!"
echo "You can now reopen the project in the dev container to use FFmpeg 7.1"
echo ""
echo "To verify the FFmpeg version after reopening:"
echo "  ffmpeg -version"
echo ""
echo "To rebuild your C++ addon with the new FFmpeg:"
echo "  npm run clean && npm run make" 