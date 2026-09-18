---
name: editframe-create
description: "Scaffold a new Editframe video project from a template. This generates the project structure, installs dependencies, and sets up composition tooling to start immediately."
license: MIT
metadata:
  author: editframe
  version: "3.0"
---


# Create Editframe Project

```bash
npm create @editframe
```

This command asks for a project directory name and a template. Unless you pass `--skip-skills`, it also asks whether to install AI agent skills globally (the default) or into the project only. Select project-only installation when the skills belong to this project.

For unattended creation, skip skill installation to preserve existing agent configuration:

```bash
npm create @editframe -- html -d my-project -y --skip-skills
cd my-project
npm start   # live preview at http://localhost:5173 (html/react); http://localhost:3000 (nextjs)
```

Edit `index.html` (or `src/Video.tsx` for the `react` template) to build the composition. Changes hot-reload instantly. Then render:

```bash
npx editframe render -o output.mp4
```

## Options

```bash
npm create @editframe -- [template] [options]
```

| Option | Effect |
|---|---|
| `-d, --directory <name>` | Project directory name |
| `--skip-install` | Skip `npm install` |
| `--skip-skills` | Skip agent skills installation entirely |
| `-g, --global` | Install agent skills to `~/.claude/skills` + `~/.agents/skills` (default when prompted) instead of `.claude/skills`/`.agents/skills` in the new project |
| `-y, --yes` | Skip all prompts, use defaults |

## Templates

| Template | Stack | Notable deps |
|---|---|---|
| `html` | Plain HTML/CSS/JS, Vite | `@editframe/elements`, `@editframe/cli`, `@editframe/vite-plugin`, `tailwindcss` |
| `react` | React + TypeScript, Vite | `@editframe/react`, `@editframe/cli`, `@editframe/vite-plugin`, `react`, `tailwindcss` |
| `nextjs` | Next.js + TypeScript | `@editframe/react`, `@editframe/elements`, `@editframe/nextjs-plugin`, `next` — for server-rendered compositions (see the `composition` skill's SSR section) |

Every template ships a `package.json`, a `.gitignore`, an `AGENTS.md`, and `src/assets/` for media files. `html` and `react` also get a `vite.config.ts`, with Tailwind through `@tailwindcss/vite`. `html`'s entry point is `index.html` plus `src/index.js`. `react`'s entry point is `src/main.tsx` (with `TimelineRoot`) plus `src/Video.tsx`. `nextjs`'s entry point is `src/app/layout.tsx` plus `src/app/page.tsx`.

The `nextjs` template does not include `@editframe/cli`. Install it separately (`npm install -D @editframe/cli`) to use `editframe render`, `editframe transcribe`, or other CLI commands in that template.

## Agent Skills Installation

Use global installation only when the user requests skills for all projects. It can overwrite existing installed skill files.

Without `--skip-skills`, `--yes` selects global installation. The current CLI has no project-scope flag; choose that scope interactively.

`--skip-skills` changes no agent skill files. Existing skills remain available.

`installAgentSkills` copies six bundled skill directories into `.claude/skills/` and `.agents/skills/`: `editframe-composition`, `editframe-editor-gui`, `editframe-dev-server`, `editframe-webhooks`, `editframe-brand-video-generator`, and `editframe-motion-design`. The same six install for every template, so a `nextjs` project also gets `editframe-dev-server`, which covers `withEditframe()` alongside the Vite plugin. Depending on scope, this rewrites into the project directory or into the home directory. This gives an agent working in the new project immediate composition, editor-gui, and other context, with no separate install step. On success, it prints "Agent Skills Installed". A copy failure is reported but does not fail project creation.

These installed folder names carry an `editframe-` prefix. The `composition`, `editor-gui`, `dev-server`, and `webhooks` skills referenced elsewhere in this document (and by other skills' cross-references) are the same content under their unprefixed source names. An agent searching `~/.claude/skills/composition` after installation will not find it. Look for `~/.claude/skills/editframe-composition` instead.

## Next Steps

After creating a project:

- Building compositions (HTML or React syntax): see the `composition` skill
- Building editor UIs (timeline, scrubber, controls): see the `editor-gui` skill
- Rendering, previewing, transcribing from the CLI, and the `@editframe/api` SDK: see the `editframe-api` skill
