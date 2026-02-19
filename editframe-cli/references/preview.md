---
name: Preview
description: Preview Editframe compositions in the browser during development
---


# Preview

Launch a live preview of your composition during development.

## Usage

```bash
npx editframe preview [directory]
```

## Arguments

- `directory` — Project directory (default: `.`)

## How It Works

Starts a Vite dev server and opens the project in your browser. Changes to your composition are reflected instantly via hot module replacement.

In scaffolded projects, `npm start` runs `editframe preview`.
