---
name: editframe-create
description: "Scaffold new Editframe video projects from templates. Generates project structure, installs dependencies, and sets up composition tooling to start immediately."
license: MIT
metadata:
  author: editframe
  version: "1.0"
---


# Create Editframe Project

## When to use this skill

**Only use this skill to create a brand-new project from scratch.**

If you are already inside an Editframe project (i.e. the current directory has a `package.json` that depends on `@editframe/elements` or `@editframe/react`, or there is an `index.html` with `<ef-timegroup>`), do **not** run `npm create @editframe`. Edit the existing files instead and use the `editframe-composition` skill.

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
npm create @editframe -- html -d my-project -y
cd my-project
```

Then edit `index.html` to build your composition and render to video:

```bash
npx editframe render -o output.mp4
```

## Agent workflow note

Do **not** run `npm start` in an agent context — it starts a long-running dev server that will block execution. Use `npx editframe render` directly to produce output.

## Templates

- `html` — Minimal HTML/CSS/JS starter
- `react` — Minimal React/TypeScript starter
- `simple-demo` — HTML demo with sample assets and animations
- `react-demo` — React demo with card animations
- `card-poetry` — HTML card animation demo with audio
- `animejs` — AnimeJS integration demo (best reference for `addFrameTask` pattern)

## Reference

- [references/getting-started.md](references/getting-started.md) — Zero to rendered video
- [references/templates.md](references/templates.md) — Template details and project structure
- [references/agent-skills.md](references/agent-skills.md) — AI agent skills installation

## Next Steps

After creating a project, learn to build compositions:

- **HTML/Web Components**: See the `editframe-composition` skill
- **React**: See the `editframe-composition` skill
- **CLI tools**: See the `editframe-cli` skill for rendering, previewing, and more
