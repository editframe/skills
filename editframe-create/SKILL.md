---
name: editframe-create
description: "Scaffold new Editframe video projects from templates. Generates project structure, installs dependencies, and sets up composition tooling to start immediately."
license: MIT
metadata:
  author: editframe
  version: "1.0"
---


# Create Editframe Project

## Which template?

| If you want to... | Use |
|-------------------|-----|
| Build with HTML/web components | `html` |
| Build with React/TypeScript | `react` |
| Integrate an animation library (AnimeJS, GSAP, etc.) | `animejs` (shows `addFrameTask` pattern) |
| See a working composition with assets | `simple-demo` or `card-poetry` |
| See a React composition with media | `react-demo` |

**Rule of thumb:** use `html` or `react` as your real project base. Use demos only for reference — they have sample assets you'll want to replace.

## Quick Start

```bash
npm create @editframe
```

Follow the prompts to pick a template and project name. Or skip prompts:

```bash
npm create @editframe -- html -d my-project -y
cd my-project
npm start
```

This opens a live preview. Edit `index.html` to build your composition, then render to video:

```bash
npx editframe render -o output.mp4
```

## Templates

- `html` — Minimal HTML/CSS/JS starter
- `react` — Minimal React/TypeScript starter
- `simple-demo` — HTML demo with sample assets and animations
- `react-demo` — React demo with card animations
- `card-poetry` — HTML card animation demo with audio
- `animejs` — AnimeJS integration demo (best reference for `addFrameTask` pattern)

## Getting Started

- [references/getting-started.md](references/getting-started.md) — Zero to rendered video

## Reference

- [references/templates.md](references/templates.md) — Template details and project structure
- [references/agent-skills.md](references/agent-skills.md) — AI agent skills installation

## Next Steps

After creating a project, learn to build compositions:

- **HTML/Web Components**: See the `elements-composition` skill
- **React**: See the `react-composition` skill
- **CLI tools**: See the `editframe-cli` skill for rendering, previewing, and more
