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

# Create Editframe Project

## When to use this skill

**Only use this skill to create a brand-new project from scratch.**

If you are already inside an Editframe project (i.e. the current directory has a `package.json` that depends on `@editframe/elements` or `@editframe/react`, or there is an `index.html` with `<ef-timegroup>`), do **not** run `npm create @editframe`. Edit the existing files instead and use the `editframe-composition` skill.

## Which template?

| If you want to... | Use |
|-------------------|-----|
| Build with HTML/web components | `html` |
| Build with React/TypeScript | `react` |

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

## Reference

- [references/getting-started.md](references/getting-started.md) — Zero to rendered video
- [references/templates.md](references/templates.md) — Template details and project structure
- [references/agent-skills.md](references/agent-skills.md) — AI agent skills installation

## Next Steps

After creating a project, learn to build compositions:

- **HTML/Web Components**: See the `editframe-composition` skill
- **React**: See the `editframe-composition` skill
- **CLI tools**: See the `editframe-cli` skill for rendering, previewing, and more
