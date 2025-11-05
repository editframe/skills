#!/bin/bash

# Setup script for processISOBMFF test files
set -ex

echo "Setting up test files for processISOBMFF tests..."

cd "$(dirname "$0")/test-files"

# Download card-joker.mp3
if [ ! -f "card-joker.mp3" ]; then
    echo "Downloading card-joker.mp3..."
    curl -o card-joker.mp3 "https://storage.googleapis.com/editframe-assets-7ac794b/card-joker.mp3"
    echo "Downloaded card-joker.mp3"
else
    echo "card-joker.mp3 already exists"
fi

# Create minimal test.mp4 if it doesn't exist
if [ ! -f "test.mp4" ]; then
    echo "Creating minimal test.mp4..."
    ffmpeg -f lavfi -i testsrc=duration=1:size=96x52:rate=30 \
           -f lavfi -i sine=frequency=1000:duration=1 \
           -c:v libx264 -c:a aac -t 1 test.mp4 \
           -y
    echo "Created test.mp4"
else
    echo "test.mp4 already exists"
fi

if [ ! -f "bars-n-tone.mp4" ]; then
    echo "Creating bars-n-tone.mp4..."
    ffmpeg -f lavfi -i testsrc2=duration=10:size=1920x1080:rate=30 \
           -f lavfi -i "sine=frequency=220:duration=10:sample_rate=48000" \
           -vf "drawbox=x=(iw-iw/4)/2:y=(ih-200)/2:w=iw/4:h=200:color=black@0.5:t=fill, \
                drawtext=text='%{frame_num}': \
                fontcolor=white: \
                fontsize=200: \
                x=(w-text_w)/2: \
                y=(h-text_h)/2: \
                fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf" \
           -c:v libx264 -c:a aac -t 10 -pix_fmt yuv420p -ar 48000 bars-n-tone.mp4 \
           -y
    echo "Created bars-n-tone.mp4"
else
    echo "bars-n-tone.mp4 already exists"
fi

echo "Test files setup complete!"
echo "Files in test-files directory:"
ls -lah | grep mp4
