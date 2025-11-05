#!/bin/bash

# Install FFmpeg build dependencies for Ubuntu/Debian systems

set -e

echo "🔧 Installing FFmpeg build dependencies for Debian/Ubuntu..."

export DEBIAN_FRONTEND=noninteractive

# Enable universe repository for additional codecs (already enabled in Ubuntu 24.04 by default)

apt-get update

# Install core dependencies first
apt-get -y install --no-install-recommends \
    build-essential \
    yasm \
    nasm \
    pkg-config \
    libcurl4-openssl-dev \
    libaom-dev \
    libass-dev \
    libfreetype6-dev \
    libmp3lame-dev \
    libopus-dev \
    libvorbis-dev \
    libvpx-dev \
    libx264-dev \
    libx265-dev \
    libssl-dev \
    libwebp-dev \
    libtheora-dev \
    libspeex-dev \
    wget

# Try to install fdk-aac-dev if available, continue if not
apt-get -y install --no-install-recommends libfdk-aac-dev || echo "libfdk-aac-dev not available, continuing without it"

# Clean up
rm -rf /var/lib/apt/lists/*

echo "✅ FFmpeg build dependencies installed successfully!" 