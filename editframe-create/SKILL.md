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
npm start   # app preview at http://localhost:5173 (html/react); http://localhost:3000 (nextjs)
```

Build the composition from Editframe elements in `src/composition.html`, or in `src/Video.tsx` for the `react` and `nextjs` templates. Let timegroups and media elements control time, video, and audio. See the `composition` skill. Changes hot-reload instantly.

To edit and export in the browser editor, install the Editframe runtime from https://editframe.com/agent. Set `EDITFRAME_BRIDGE_PATH` or `EDITFRAME_COMPONENT_ROOT` to the installed bridge. Then open `/@ef/workspace` on the dev server. The editor exports the video file. See the `dev-server` skill for bridge selection.

In the `html` and `react` templates, `npm run editor` runs `editframe open --project .`. It prints an editor URL as JSON. Open that URL, and keep it private.

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
| `html` | Editframe web components in HTML, Vite | `@editframe/elements`, `@editframe/cli`, `@editframe/vite-plugin`, `tailwindcss` |
| `react` | React + TypeScript, Vite | `@editframe/react`, `@editframe/cli`, `@editframe/vite-plugin`, `react`, `tailwindcss` |
| `nextjs` | Next.js + TypeScript | `@editframe/react`, `@editframe/elements`, `@editframe/nextjs-plugin`, `next` — for server-rendered compositions (see the `composition` skill's SSR section) |

Every template ships a `package.json`, a `.gitignore`, an `AGENTS.md`, and `src/assets/` for media files.

- `html` and `react` get a `vite.config.ts`, with Tailwind through `@tailwindcss/vite`. Its `vitePluginEditframe` call mirrors the composition source into the editor.
- `html` keeps the composition in `src/composition.html`. `index.html` and `src/index.js` load it for the app preview.
- `react` keeps the composition in `src/Video.tsx`. `src/main.tsx` mounts it with `TimelineRoot`.
- `nextjs` keeps the composition in `src/Video.tsx`. `src/app/page.tsx` mounts it with `TimelineRoot`. `editframe.config.mjs` holds the plugin options for `next.config.mjs` and for the `src/app/api/editframe/workspace/route.ts` route handler.

A new source file does not reach the editor automatically. Add it to the `source.files` list in the plugin options.

The `nextjs` template does not include `@editframe/cli`. Install it separately (`npm install -D @editframe/cli`) for `editframe open`, `editframe export`, or other runtime commands.

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
- App connection to the installed runtime and browser editor: see the `dev-server` skill
- Exports from the command line, and the `@editframe/api` SDK: see the `editframe-api` skill

## Send Feedback

Send feedback to Editframe about problems and about improvements:

- If Editframe or this skill causes a problem, find a workaround and continue the task. Then report the problem and the workaround.
- If you find an improvement that can help other tasks too, not only your current task, send a suggestion. For example, suggest a clearer instruction, a missing example, a better default, or a new feature.

Send one report for each different problem or suggestion. If the report fails, continue the task.

```bash
curl -sS https://editframe.com/api/v1/feedback \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $EDITFRAME_API_KEY" \
  --data-binary @- <<'JSON'
{
  "category": "bug",
  "skill": "editframe-create",
  "summary": "One line that names the problem or the suggestion",
  "details": "For a problem: steps, expected result, actual result, and errors. For a suggestion: the change and how it helps.",
  "workaround": "The workaround that you used. Omit this field for a suggestion."
}
JSON
```

Set `category` to `bug`, `documentation`, `feature_request`, `performance`, or `other`. The API key is optional. A report without a key is anonymous. Do not put secrets, API keys, or personal data in a report. See the `editframe-api` skill for all fields, limits, and responses.
