---
title: Install FFmpeg
description: Install FFmpeg on Mac, Windows, or Linux.
type: how-to
nav:
  parent: "Setup"
  priority: 2
---

# Install FFmpeg

FFmpeg is used by Editframe to encode your composition into a video file.

## Mac

```bash
brew install ffmpeg
```

If you don't have Homebrew, [install it first](https://brew.sh).

## Windows

```bash
winget install Gyan.FFmpeg
```

Or download a build from [ffmpeg.org](https://ffmpeg.org/download.html#build-windows) and add it to your PATH.

## Linux

```bash
sudo apt install ffmpeg
```

## Verify

```bash
ffmpeg -version
```

You should see version info starting with `ffmpeg version ...`.
