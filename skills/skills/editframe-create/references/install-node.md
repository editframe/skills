---
title: Install Node.js
description: Install Node.js on Mac, Windows, or Linux.
type: how-to
nav:
  parent: "Setup"
  priority: 1
---

# Install Node.js

## Mac

The easiest way is with [Homebrew](https://brew.sh):

```bash
brew install node
```

If you don't have Homebrew, install it first — it's the standard package manager for Mac and you'll use it for FFmpeg too.

Alternatively, download the installer from [nodejs.org](https://nodejs.org/en).

## Windows

```bash
winget install OpenJS.NodeJS
```

Or download the installer from [nodejs.org](https://nodejs.org/en).

## Linux

```bash
sudo apt install nodejs npm
```

Or use [nvm](https://github.com/nvm-sh/nvm) if you need to manage multiple Node versions.

## Verify

```bash
node -v
```

You should see a version number like `v22.0.0`.
