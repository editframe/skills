---
name: skills-creation
description: Create, update, and maintain skills in the canonical .skills/internal/ directory. Includes step-by-step directives for agents to work with users, validate skill structure, and sync changes across agent directories. Use when users want to create new skills, update existing ones, or need guidance on skill authoring.
---

# Skills Creation & Maintenance

Agent guide for creating and updating skills in Editframe's centralized skills system.

## Overview

Skills are the foundation of agent capabilities. This skill provides directives for:
- **Creating new skills** from scratch with user guidance
- **Updating existing skills** with validation
- **Maintaining skill quality** through structured authoring
- **Syncing skills** across agent directories after changes

## Quick Start: Creating a New Skill

1. **Ask the user** what skill they want to create
2. **Gather requirements**: purpose, capabilities, use cases
3. **Create skill structure** in `.skills/internal/{skill-name}/`
4. **Write content** (SKILL.md + optional references/)
5. **Validate** the structure and frontmatter
6. **Sync** changes across agent directories
7. **Commit** to git

## Agent Workflow Directives

### Phase 1: Discovery

When a user requests a new skill or skill update:

1. **Ask clarifying questions**:
   - "What is the primary purpose of this skill?"
   - "Who will use this skill (which agents/users)?"
   - "What are the key capabilities or topics?"
   - "Is this updating an existing skill or creating new?"

2. **Document requirements**:
   - Skill name (kebab-case: `my-skill-name`)
   - Description (one sentence for LLMs)
   - Key sections/topics to cover
   - Example use cases

### Phase 2: Structure Planning

Before writing, plan the skill structure:

1. **Determine skill type**:
   - **Reference skill**: Documenting an existing system/API (most common)
   - **Tutorial skill**: Step-by-step learning with examples
   - **How-to skill**: Specific task guidance
   - **Explanation skill**: Deep conceptual understanding

2. **Plan file structure**:
   ```
   .skills/internal/{skill-name}/
   └── SKILL.md                    # Main entry point (required)
   ```

   OR if detailed:
   ```
   .skills/internal/{skill-name}/
   ├── SKILL.md                    # Overview + quick start
   └── references/
       ├── topic-1.md              # Deep dive on topic 1
       ├── topic-2.md              # Deep dive on topic 2
       └── topic-3.md              # Examples/guides
   ```

3. **Quick reference template**:
   - SKILL.md: 200-400 words introducing the skill
   - Each reference: 400-800 words covering one topic
   - Focus on clarity for LLM consumption

### Phase 3: Content Creation

**SKILL.md frontmatter** (required):
```yaml
---
name: skill-name-kebab-case
description: One sentence describing what this skill does and who should use it.
---
```

**SKILL.md body** (recommended structure):
```markdown
# {Skill Title}

{2-3 sentence overview}

## Quick Start

{Most essential information to start using - code snippet, key concept, or first steps}

## Key Concepts

{Explain the main ideas or capabilities}

## Common Patterns

{Show 2-3 typical use cases with examples}

## When to Use This Skill

{Guidance on when agents should invoke this skill}
```

**Reference files** (optional, for complex skills):
```yaml
---
name: reference-title
description: What this reference covers
---

# Reference Title

{Introduction}

## Section 1
{Content}

## Section 2
{Content}
```

**Writing guidelines**:
- Target 300-500 words for SKILL.md
- Use concrete examples over abstract explanations
- Include code blocks or snippets when relevant
- Link between skills using relative paths: `[skill-name](...)`
- Write for LLM consumption (clear, structured, no marketing)

### Phase 4: Validation

Before syncing, validate the skill:

1. **File structure check**:
   ```bash
   # Verify files exist
   ls -la .skills/internal/{skill-name}/

   # Should see: SKILL.md (required)
   # May see: references/ directory with additional .md files
   ```

2. **Frontmatter validation**:
   - Required fields present: `name`, `description`
   - `name` is kebab-case and matches directory name
   - `description` is a single sentence
   - No syntax errors (valid YAML)

3. **Content validation**:
   - Clear introductory section
   - Well-organized subsections
   - Concrete examples included
   - Links formatted correctly: `[text](path)` or `[text](references/file.md)`

4. **Example check**:
   ```bash
   # Manually verify the content structure
   cat .skills/internal/{skill-name}/SKILL.md
   ```

### Phase 5: Synchronization

Once the skill is complete and validated:

1. **Confirm with user**: "Ready to sync this skill across all agent directories?"

2. **Run the sync script**:
   ```bash
   npm run skills:sync
   ```

3. **Verify the sync**:
   ```bash
   # Check that files now exist in all 3 directories
   ls -la .skills/internal/{skill-name}/SKILL.md
   ls -la .cursor/skills/{skill-name}/SKILL.md
   ls -la .claude/skills/{skill-name}/SKILL.md
   ```

4. **Report success**:
   ```
   ✅ Skill synced successfully!

   Synced to:
   - .skills/internal/ (canonical source)
   - .cursor/skills/ (Cursor agent)
   - .claude/skills/ (Claude Code agent)
   ```

### Phase 6: Commit to Git

If the skill is complete and approved:

1. **Stage the changes**:
   ```bash
   git add .skills/internal/{skill-name}/
   ```

2. **Create a commit**:
   ```bash
   git commit -m "Create {skill-name} skill"
   ```

3. **Confirm commit**:
   ```bash
   git log -1 --name-status
   ```

## Complete Example Interaction

**User**: "I need a skill for debugging video rendering issues"

**Agent** (Discovery Phase):
> I'll help you create a debugging skill for video rendering. Let me gather some details:
>
> 1. Should this cover common rendering errors (artifacts, playback issues, encoding)?
> 2. Who are the primary users (developers, content creators)?
> 3. What systems does it cover (Elements, React, API)?

**User**: "Yes to all - it's for developers debugging Elements rendering."

**Agent** (Planning Phase):
> Perfect! I'll create a reference skill called `elements-rendering-debug` with:
> - SKILL.md: Overview of debugging workflow
> - references/common-issues.md: Artifacts, playback, memory issues
> - references/diagnostics.md: How to inspect and troubleshoot
> - references/solutions.md: Common fixes and workarounds

**Agent** (Creation Phase):
> Creating the skill structure...
>
> [writes files]

**Agent** (Validation Phase):
> Validating the skill:
> ✅ Directory structure correct
> ✅ SKILL.md frontmatter valid
> ✅ All references included
> ✅ Links formatted correctly

**Agent** (Sync Phase):
> Ready to sync this skill across all agent directories?
>
> Running: npm run skills:sync
>
> ✅ Synced successfully!
> - .skills/internal/elements-rendering-debug/ (canonical)
> - .cursor/skills/elements-rendering-debug/
> - .claude/skills/elements-rendering-debug/

**Agent** (Commit Phase):
> Committing to git:
> ```
> git add .skills/internal/elements-rendering-debug/
> git commit -m "Add elements-rendering-debug skill"
> ```
>
> ✅ Complete! The skill is now available in all agent directories.

## Updating Existing Skills

To update an existing skill:

1. **Locate the skill**:
   ```bash
   ls .skills/internal/{skill-name}/
   ```

2. **Make changes**:
   - Edit SKILL.md content
   - Add/modify reference files
   - Update frontmatter if needed

3. **Validate** (same as Phase 4 above)

4. **Sync**:
   ```bash
   npm run skills:sync
   ```

5. **Commit**:
   ```bash
   git add .skills/internal/{skill-name}/
   git commit -m "Update {skill-name} skill"
   ```

## Skill Directory

Current skills in `.skills/internal/`:

- **css-animations** - CSS animation fill-mode requirements
- **diagnostic-logs** - Creating diagnostic logs for debugging
- **editor-gui** - Building video editing interfaces
- **monorepo-setup-git** - Git configuration and workflows
- **monorepo-setup-worktrees** - Git worktrees setup
- **profile-tests** - CPU performance profiling
- **skills-creation** - This skill! Creating and maintaining skills
- **skills-docs** - Skills documentation system (for published skills)
- **swiss-bauhaus-design** - Design principles and aesthetics
- **threejs-compositions** - 3D scenes with Three.js
- **video-analysis** - Video file analysis and debugging
- **visual-thinking** - Creating visual analogies and explanations

## Key Files & Scripts

### Scripts

- **`npm run skills:sync`** - Sync internal skills to all agent directories
- **`npm run skills:sync:dry`** - Preview what would be synced
- **`npm run skills:sync:verbose`** - Detailed sync output
- **`npm run skills:generate`** - Generate external published skills

### Directories

- **`.skills/internal/`** - Canonical source of truth (committed to git)
- **`.cursor/skills/`** - Cursor agent's synced copy
- **`.claude/skills/`** - Claude Code agent's synced copy
- **`.skills/external/`** - Generated external skills (gitignored)

### Documentation

- **`skills/SYNC.md`** - Complete skills sync system documentation
- **`.skills/internal/skills-docs/SKILL.md`** - Detailed skills documentation system

## When NOT to Create a Skill

A skill is **not** needed for:
- One-off tasks or debugging sessions
- Temporary utilities or scripts
- Content that belongs in code comments
- Questions that agents can answer inline

A skill **is** appropriate for:
- Repeatable processes (create new projects, debug patterns)
- Guidance that multiple agents should follow
- Knowledge that needs to be discoverable
- Practices that should be standardized

## Tips for Good Skills

✅ **Clear purpose** - One skill, one clear purpose or domain
✅ **Self-contained** - Can be understood independently
✅ **Practical** - Includes real examples and patterns
✅ **Discoverable** - Name clearly describes what it covers
✅ **Linkable** - References other skills when relevant
✅ **Current** - Updated when practices change

## Troubleshooting

**Q: Skill not syncing?**
A: Run `npm run skills:sync:dry` to see if there are errors. Check file permissions in `.skills/internal/`.

**Q: Should I edit in .cursor/ or .skills/?**
A: Always edit in `.skills/internal/` (canonical source). That's what gets committed to git.

**Q: Can I have agent-specific skills?**
A: No, all agents get identical skills. Use `.skills/internal/` as the single source.

**Q: How do I delete a skill?**
A: Delete from `.skills/internal/`, then run `npm run skills:sync`. The skill is automatically removed from agent directories.

**Q: Need to revert a skill change?**
A: Use git: `git checkout HEAD -- .skills/internal/{skill-name}/` then `npm run skills:sync`.
