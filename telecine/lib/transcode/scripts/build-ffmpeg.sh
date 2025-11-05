#!/bin/bash

# Build FFmpeg 7.1 from source

set -e

FFMPEG_VERSION="7.1.1"
FFMPEG_URL="https://ffmpeg.org/releases/ffmpeg-${FFMPEG_VERSION}.tar.xz"
INSTALL_PREFIX="${INSTALL_PREFIX:-/usr/local}"
BUILD_DIR="${BUILD_DIR:-/tmp}"

echo "🎬 Building FFmpeg ${FFMPEG_VERSION} from source..."
echo "Install prefix: ${INSTALL_PREFIX}"
echo "Build directory: ${BUILD_DIR}"

# Create build directory and navigate to it
mkdir -p "${BUILD_DIR}"
cd "${BUILD_DIR}"

# Download and extract FFmpeg source
echo "📥 Downloading FFmpeg ${FFMPEG_VERSION}..."
wget -q "${FFMPEG_URL}"
tar -xf "ffmpeg-${FFMPEG_VERSION}.tar.xz"
cd "ffmpeg-${FFMPEG_VERSION}"

# Configure FFmpeg build
echo "⚙️  Configuring FFmpeg build..."
./configure \
    --prefix="${INSTALL_PREFIX}" \
    --enable-gpl \
    --enable-version3 \
    --enable-nonfree \
    --disable-static \
    --enable-shared \
    --disable-debug \
    --enable-libaom \
    --enable-libass \
    --enable-libfdk-aac \
    --enable-libfreetype \
    --enable-libmp3lame \
    --enable-libopus \
    --enable-libvorbis \
    --enable-libvpx \
    --enable-libx264 \
    --enable-libx265 \
    --enable-openssl \
    --enable-libwebp \
    --enable-libtheora \
    --enable-libspeex

# Build FFmpeg
echo "🔨 Building FFmpeg (this may take a while)..."
make -j$(nproc)

# Install FFmpeg
echo "📦 Installing FFmpeg..."
make install

# Update library cache
if command -v ldconfig >/dev/null 2>&1; then
    ldconfig "${INSTALL_PREFIX}/lib" || ldconfig
fi

# Clean up build files
echo "🧹 Cleaning up build files..."
cd /
rm -rf "${BUILD_DIR}/ffmpeg-${FFMPEG_VERSION}"*

# Verify installation
echo "✅ FFmpeg ${FFMPEG_VERSION} built and installed successfully!"
echo "📍 Installation location: ${INSTALL_PREFIX}"

# Show version info
if command -v ffmpeg >/dev/null 2>&1; then
    echo "🎉 FFmpeg version verification:"
    ffmpeg -version | head -1
else
    echo "⚠️  FFmpeg binary not found in PATH. You may need to update your PATH to include ${INSTALL_PREFIX}/bin"
fi 