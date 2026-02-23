---
title: Agent Skills
description: Install Editframe AI coding agent skills into Cursor, Windsurf, and other LLM-based IDEs for in-editor composition help.
type: how-to
skill: false
nav:
  parent: "Reference"
  priority: 2
---

# Install Agent Skills

Install Editframe skills into your AI coding agent for better assistance with video compositions.

## During Project Creation

When running `npm create @editframe`, you'll be prompted to install agent skills. Select your agent (Cursor, VS Code Copilot, Claude Code, or Windsurf) and skills will be installed automatically.

## Manual Installation

```bash
npx ai-agent-skills install editframe/skills --agent cursor
```

Replace `cursor` with your agent: `cursor`, `claude`, `vscode`, `windsurf`, or `all`.

## Installed Skills

- **elements-composition** — HTML/Web Components for video
- **react-composition** — React components for video
- **motion-design** — Animation and motion principles

## Skip Installation

```bash
npm create @editframe -- html --skip-skills -y
```

Or skip only the skills prompt while keeping other prompts:

```bash
npm create @editframe -- --skip-skills
```
