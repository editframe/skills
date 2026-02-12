# Skills Build Process

## Overview

The skills system maintains two versions of documentation:

1. **Source files** (`skills/skills/`) - Rich frontmatter for human-facing documentation browser
2. **Generated files** (`skills/skills-generated/`) - Clean, terse frontmatter for LLM consumption

## Source Files (skills/skills/)

These are the **source of truth** and are committed to the monorepo.

### Frontmatter Structure

Source files include rich metadata for the human documentation browser:

```yaml
---
title: Element Name
description: Brief description
type: reference
nav:
  parent: "Category / Subcategory"
  priority: 10
  related: ["other-ref"]
track: "learning-path-name"
track_step: 1
track_title: "Step Title"
prerequisites: ["prerequisite-ref"]
next_steps: ["next-ref"]
api:
  attributes:
    - name: attr-name
      type: string
      required: true
      default: value
      description: What it does
      values: ["option1", "option2"]
sections:
  - slug: section-slug
    title: Section Title
    heading: Section Heading
    type: tutorial
    description: Section description
---
```

## Generated Files (skills/skills-generated/)

These are **build artifacts** and are:
- Generated from source files
- **Not committed** to the monorepo (gitignored)
- Pushed directly to the skills repository

### Generation Process

The generation script (`scripts/generate-skills.ts`):
1. Strips human-only metadata (`nav`, `track`, `sections`, `api`, etc.)
2. Keeps only LLM-essential frontmatter (`name`, `description`)
3. Converts structured `api` metadata to prose format
4. Outputs clean markdown files

### Generated Frontmatter

```yaml
---
name: Element Name
description: Brief description
---
```

API attributes are converted to prose and injected after the h1:

```markdown
# ef-element

## Attributes

- **attr-name** (string) (required) - What it does
- **other-attr** (number, default: 1.0) - Another attribute
```

## Build & Push Workflow

### Generate and Push to Skills Repository

```bash
# Generate clean LLM files and push to skills remote
./scripts/push-skills

# Push to a specific branch
./scripts/push-skills --branch feature-branch
```

The push script:
1. Cleans the build directory
2. Generates LLM-optimized files
3. Initializes a fresh git repo in the build directory
4. Pushes to the skills remote
5. Cleans up the build directory

### Local Development

To test generation locally:

```bash
# Generate files (creates skills/skills-generated/)
npx tsx scripts/generate-skills.ts

# View generated files
ls skills/skills-generated/

# Clean up
rm -rf skills/skills-generated/
```

## Best Practices

1. **Always edit source files** (`skills/skills/`), never generated files
2. **Commit source changes** to the monorepo
3. **Run push-skills** when ready to update the skills repository
4. **Don't commit** the `skills-generated/` directory (it's gitignored)

## Why This Approach?

- **Single source of truth**: Source files drive both human and LLM documentation
- **Clean separation**: Human metadata doesn't pollute LLM context
- **Build artifacts**: Generated files are treated as compiled output
- **No monorepo pollution**: Build directory never gets committed
