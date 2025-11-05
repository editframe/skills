#!/bin/bash

# Install FFmpeg runtime dependencies for Alpine Linux systems

set -e

echo "🔧 Installing FFmpeg runtime dependencies for Alpine..."

apk add --no-cache \
    curl-dev \
    aom \
    libass \
    fdk-aac \
    freetype \
    lame \
    opus \
    libvorbis \
    libvpx \
    x264-libs \
    x265-libs \
    libwebp \
    libtheora \
    speex

# Update library cache
if command -v ldconfig >/dev/null 2>&1; then
    ldconfig /usr/local/lib || true
fi

echo "✅ FFmpeg runtime dependencies installed successfully!" 