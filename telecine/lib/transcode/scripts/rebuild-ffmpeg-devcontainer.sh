#!/bin/bash

# Rebuild FFmpeg 7.1 from source within the devcontainer

set -e

echo "🎬 Rebuilding FFmpeg 7.1 in devcontainer..."

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Check if we're running as root or with sudo
if [[ $EUID -ne 0 ]]; then
    echo "This script needs to be run as root or with sudo."
    echo "Usage: sudo $0"
    exit 1
fi

# Install dependencies if needed
echo "📦 Installing/updating FFmpeg build dependencies..."
bash "${SCRIPT_DIR}/install-ffmpeg-deps-ubuntu.sh"

# Build FFmpeg
echo "🔨 Building FFmpeg from source..."
bash "${SCRIPT_DIR}/build-ffmpeg.sh"

# Update PKG_CONFIG_PATH for the current user
echo "⚙️  Updating environment..."
if ! grep -q "/usr/local/lib/pkgconfig" /etc/environment 2>/dev/null; then
    echo 'PKG_CONFIG_PATH="/usr/local/lib/pkgconfig:$PKG_CONFIG_PATH"' >> /etc/environment
fi

# Update PATH if needed
if ! grep -q "/usr/local/bin" /etc/environment 2>/dev/null; then
    echo 'PATH="/usr/local/bin:$PATH"' >> /etc/environment
fi

echo ""
echo "✅ FFmpeg 7.1 rebuilt successfully!"
echo ""
echo "🔄 To use the new FFmpeg in your current session:"
echo "   export PKG_CONFIG_PATH=\"/usr/local/lib/pkgconfig:\$PKG_CONFIG_PATH\""
echo "   export PATH=\"/usr/local/bin:\$PATH\""
echo ""
echo "🔧 To rebuild your C++ addon with the new FFmpeg:"
echo "   npm run clean && npm run make"
echo ""
echo "🎉 FFmpeg version:"
/usr/local/bin/ffmpeg -version | head -1 