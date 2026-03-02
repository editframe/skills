---
name: linear-cli
description: Load Linear issues to initiate tasks, search/list issues, view issue details, and manage issue state using the linear CLI. Use when the user references a Linear issue, wants to start work from Linear, or asks to search Linear.
---

# Linear CLI

Interact with the Linear issue tracker from the command line. The primary use cases are:

- **Starting tasks from issues** -- fetch an issue by ID, read its description, and begin work
- **Searching/listing issues** -- find issues by state, assignee, team, or free-text search
- **Viewing issue details** -- read full descriptions, comments, and metadata
- **Updating issue state** -- mark issues as started, add comments with progress

## Setup

### Install

```bash
brew install schpet/tap/linear
```

### Authenticate

1. Create an API key at https://linear.app/settings/account/security (requires member access, not guest)
2. Run `linear auth login` and paste the key when prompted
3. Verify: `linear auth whoami`

### Configure for this repo

```bash
linear config
```

This writes a `.linear.toml` in the repo root with the team ID and workspace slug. The file is checked into git so all agents and developers share the same config.

## Starting a Task from an Issue

When given an issue ID (e.g. `ENG-123`):

```bash
# Read the full issue -- description, state, assignee, labels, comments
linear issue view ENG-123

# Get just the title (useful for branch names or commit messages)
linear issue title ENG-123

# Get the Linear URL
linear issue url ENG-123
```

The agent should read the issue description to understand requirements before starting implementation.

## Searching and Listing Issues

```bash
# List unstarted issues assigned to you (default)
# --sort is required: manual or priority (NOT "updated")
linear issue list --sort priority

# List issues in a specific state
linear issue list -s started --sort priority
linear issue list -s backlog --sort priority
linear issue list --all-states --sort priority

# List issues for all assignees
linear issue list -A --sort priority

# List unassigned issues
linear issue list -U --sort priority

# Filter by project -- requires exact name match; use GraphQL if not found
linear issue list --project "Project Name" --sort priority --team ENG

# Filter by team (required if no .linear.toml in repo)
linear issue list --team ENG --sort priority

# Limit results
linear issue list --limit 10 --sort priority
```

### List issues in a project via GraphQL (preferred for project browsing)

The CLI `--project` filter is fragile (exact name match, requires team). Use GraphQL instead:

```bash
# First find the project ID
linear api <<'GRAPHQL'
query {
  projects(first: 50) {
    nodes { id name }
  }
}
GRAPHQL

# Then fetch its issues
linear api <<'GRAPHQL'
query {
  project(id: "<id>") {
    issues(first: 50) {
      nodes { identifier title state { name } assignee { name } priority }
    }
  }
}
GRAPHQL
```

### Free-text search via GraphQL

The CLI doesn't have a built-in search command, but the `api` subcommand exposes the full GraphQL API:

```bash
linear api --variable term="onboarding" <<'GRAPHQL'
query($term: String!) {
  searchIssues(term: $term, first: 20) {
    nodes { identifier title state { name } assignee { name } }
  }
}
GRAPHQL
```

Pipe to `jq` for filtering:

```bash
linear api --variable term="bug" <<'GRAPHQL'
query($term: String!) {
  searchIssues(term: $term, first: 20) {
    nodes { identifier title state { name } }
  }
}
GRAPHQL
```

## Updating Issues

```bash
# Mark as started (sets state to "In Progress")
# NOTE: linear issue update fails with "Could not determine team key from issue ID"
# for non-standard prefixes (e.g. EF2-123). Use GraphQL mutation instead (see below).
linear issue update ENG-123 -s started

# Update title or description
linear issue update ENG-123 -t "New title"
linear issue update ENG-123 --description-file /tmp/desc.md

# Add a comment
linear issue comment add ENG-123 -b "Started implementation"

# For multi-line markdown comments, use a file
linear issue comment add ENG-123 --body-file /tmp/comment.md
```

### Update issue state via GraphQL (when CLI update fails)

```bash
# Find the state ID first
linear api <<'GRAPHQL'
query {
  workflowStates(filter: { name: { eq: "Done" } }) {
    nodes { id name team { key } }
  }
}
GRAPHQL

# Then update one or more issues in a single mutation
linear api <<'GRAPHQL'
mutation {
  issueUpdate(id: "EF2-123", input: { stateId: "<state-id>" }) { success }
}
GRAPHQL

# Batch update multiple issues
linear api <<'GRAPHQL'
mutation {
  a: issueUpdate(id: "EF2-436", input: { stateId: "<state-id>" }) { success }
  b: issueUpdate(id: "EF2-435", input: { stateId: "<state-id>" }) { success }
}
GRAPHQL
```

## Creating Issues

```bash
# Interactive (prompts for details)
linear issue create

# Non-interactive
linear issue create -t "Fix rendering bug" --description-file /tmp/desc.md -a self -s unstarted

# Create and immediately start working
linear issue create -t "Investigate flaky test" --start
```

Always use `--description-file` or `--body-file` for multi-line markdown content to avoid shell escaping issues.

## Discovering CLI Options

Every command supports `--help`:

```bash
linear --help
linear issue --help
linear issue list --help
linear issue create --help
```

The CLI has extensive subcommands beyond issues -- `linear team`, `linear project`, `linear document`, `linear label`, `linear milestone`. Run `--help` on any of them.

## When to Use This Skill

- User provides a Linear issue ID and wants to begin work on it
- User asks to find or search for Linear issues
- User wants to see what's assigned to them or what's in a specific state
- User asks to update an issue's status or add a comment
- Agent needs to read issue requirements before starting implementation
