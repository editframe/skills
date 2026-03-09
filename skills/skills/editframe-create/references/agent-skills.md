---
title: Agent Skills
description: Editframe AI coding agent skills are installed automatically when you create a project and work with Claude Code, OpenCode, Cursor, Windsurf, and GitHub Copilot.
type: how-to
skill: false
nav:
  parent: "Reference"
  priority: 2
---

# Agent Skills

Editframe skills are installed automatically into your project when you run `npm create @editframe`. They work with Claude Code, OpenCode, Cursor, Windsurf, and any agent that reads `.agents/skills/`.

## Installed Skills

- **editframe-composition** — HTML web components and React for building video compositions
- **editframe-motion-design** — Animation and motion design principles for video

## Where Skills Are Installed

Skills are written to two project-local directories:

- `.claude/skills/` — native for Claude Code; compatibility path for Cursor, OpenCode, Windsurf
- `.agents/skills/` — cross-agent standard; primary for Cursor, native for OpenCode and Windsurf

An `AGENTS.md` is also written to the project root for agents that read it (GitHub Copilot, etc.).

## Skip Installation

```bash
npm create @editframe -- html --skip-skills -y
```
