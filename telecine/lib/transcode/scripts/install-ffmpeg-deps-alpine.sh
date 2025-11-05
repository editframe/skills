#!/bin/bash

# Install FFmpeg build dependencies for Alpine Linux systems

set -e

echo "🔧 Installing FFmpeg build dependencies for Alpine..."

apk add --no-cache \
    build-base \
    yasm \
    nasm \
    pkgconfig \
    curl-dev \
    openssl-dev \
    aom-dev \
    libass-dev \
    fdk-aac-dev \
    freetype-dev \
    lame-dev \
    opus-dev \
    libvorbis-dev \
    libvpx-dev \
    x264-dev \
    x265-dev \
    libwebp-dev \
    libtheora-dev \
    speex-dev \
    wget

echo "✅ FFmpeg build dependencies installed successfully!" 