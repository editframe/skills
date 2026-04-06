---
name: editframe-create
title: Create Project
description: Scaffold new Editframe video projects from templates. Generates project structure, installs dependencies, and sets up composition tooling to start immediately.
order: 1
license: MIT
metadata:
  author: editframe
  version: "1.0"
---

# Create an Editframe Project

Requires [Node.js](references/install-node.md) and [FFmpeg](references/install-ffmpeg.md).

## Create a project

```bash
npm create @editframe@latest
```

Choose `html` for a simple Vite + TypeScript setup, or `react` for Vite + React. Then:

```bash
cd my-project
npm start
```

This prints a URL — open it in your browser. Your composition updates as files change.

## Build and render

Put any assets into `src/assets`, or let the agent source material itself. If you know what you want:

*"Use Editframe best practices to make me a video for [describe your video]."*

Or let the agent help you figure it out:

*"Use Editframe best practices. You're a top motion designer — help me make a launch video for my company for a new product. Ask me questions to get the perfect video, and then let's make it."*

Click the render button in the workbench, or run `npx editframe render -o output.mp4`.
