# Skills Sync System

Centralized skills management for Editframe's AI agent ecosystem. This document describes the architecture, usage, and troubleshooting of the skills sync system.

## Overview

The skills sync system provides **bi-directional synchronization** of skills across multiple AI agent directories:

- **`.skills/internal/`** - Canonical source of truth for internal skills (committed to git)
- **`.cursor/skills/`** - Cursor agent's skill directory
- **`.claude/skills/`** - Claude Code agent's skill directory
- **`.skills/external/`** - Generated external skills (gitignored, synced from `skills-generated/`)

### Key Features

✅ **Bi-directional sync** - Changes propagate in any direction
✅ **Conflict resolution** - Newest modification time wins
✅ **Safety** - Dry-run mode, backups, transaction logs
✅ **Efficient** - Only syncs changed files
✅ **Automatic** - Can be integrated into git hooks

## Architecture

### Directory Structure

```
.skills/
├── internal/                    # Canonical source (committed)
│   ├── visual-thinking/
│   │   └── SKILL.md
│   ├── profile-tests/
│   │   └── SKILL.md
│   └── ... (other internal skills)
└── external/                    # Generated skills (gitignored)
    ├── elements-composition/
    │   ├── SKILL.md
    │   └── references/
    │       └── *.md
    └── ... (other generated skills)

.cursor/skills/                 # Synced copy (not committed)
├── visual-thinking/
├── profile-tests/
└── ... (same as .skills/internal/)

.claude/skills/                 # Synced copy (not committed)
├── visual-thinking/
├── profile-tests/
└── ... (same as .skills/internal/)
```

### Sync Algorithm

The sync system uses **modification time (mtime)** to determine which version of a file is newest:

1. **Single location** - File exists in only one directory → copy to all others
2. **Multiple locations** - File exists in multiple places:
   - Compare mtimes of all versions
   - Newest mtime wins
   - Copy newest to other locations
3. **Unchanged files** - If mtimes and content match → skip
4. **Deleted files** - If deleted from `.skills/internal/` → delete from agent directories

### Conflict Resolution

When the same file is modified in multiple locations:

1. **Detect** - Most recent modification time is identified
2. **Resolve** - Newest version copied to all other locations
3. **Log** - Operation recorded in `.skills/.sync-log.json`

**Example:**
```bash
# Edit in .cursor at 10:00 AM
echo "version A" > .cursor/skills/visual-thinking/SKILL.md

# Edit in .claude at 10:05 AM (later!)
echo "version B" > .claude/skills/visual-thinking/SKILL.md

# Run sync
npm run skills:sync

# Result: version B is synced to .cursor and .skills because .claude has newer mtime
```

## Usage

### Basic Commands

```bash
# Sync all internal skills
npm run skills:sync

# Preview changes without applying
npm run skills:sync:dry

# Verbose output for debugging
npm run skills:sync:verbose

# Generate external skills and sync them too
npm run skills:full

# Generate external skills only
npm run skills:generate
```

### Daily Workflow

1. **Edit skills** in any location (`.skills/`, `.cursor/`, or `.claude/`)
2. **Run sync** when ready to sync changes across all directories
3. **Commit** changes to `.skills/internal/` (canonical source)

```bash
# Make your edits in any agent directory...
# Then sync
npm run skills:sync

# Commit the changes from .skills/internal/ to git
git add .skills/internal/
git commit -m "Update visual-thinking skill"
```

### Advanced Options

#### Dry-Run Mode

See what would change without making changes:

```bash
npm run skills:sync:dry
```

Output shows:
- Number of files to copy
- Number of files to delete
- Specific operations planned

#### Verbose Output

Detailed logging of all operations:

```bash
npm run skills:sync:verbose
```

#### External Skills Integration

Generate published skills and sync to all directories:

```bash
npm run skills:full
```

This:
1. Runs `scripts/generate-skills.ts` to generate skills from `skills/skills/`
2. Copies generated skills to `.skills/external/`
3. Syncs `.skills/external/` to `.cursor/skills/` and `.claude/skills/`

## How It Works

### File Scanning

When you run `npm run skills:sync`, the system:

1. **Scans** three directories:
   - `.skills/internal/`
   - `.cursor/skills/`
   - `.claude/skills/`

2. **Collects metadata** for each file:
   - File path (relative)
   - Modification time (mtime)
   - File size
   - Content hash (MD5)
   - Which directory(ies) contain the file

3. **Builds operation queue** based on file states

### Operation Execution

For each file, the system decides:

```
IF file exists in only 1 location
  → Copy to other 2 locations

ELSE IF file exists in multiple locations
  → Compare mtimes
  → Copy newest version to all other locations

ELSE IF file deleted from .skills/internal/
  → Delete from .cursor/skills/ and .claude/skills/

ELSE
  → Skip (no changes needed)
```

### Transaction Logging

Every sync creates a log in `.skills/.sync-log.json`:

```json
{
  "timestamp": "2024-02-13T14:30:45.123Z",
  "operations": [
    {
      "type": "copy",
      "path": "visual-thinking/SKILL.md",
      "from": ".claude",
      "to": ".cursor",
      "reason": "Update from .claude (newer: 2024-02-13T14:25:00.000Z)"
    }
  ],
  "summary": {
    "copied": 1,
    "deleted": 0,
    "skipped": 15,
    "errors": 0
  }
}
```

## Scenarios

### Scenario 1: New Skill Created in Cursor

You create a new skill in `.cursor/skills/my-new-skill/SKILL.md`:

```bash
# File only exists in .cursor at this point
mkdir -p .cursor/skills/my-new-skill
echo "---\nname: my-new-skill\n---\n# New Skill" > .cursor/skills/my-new-skill/SKILL.md

# Run sync
npm run skills:sync

# Result:
# - File copied to .skills/internal/my-new-skill/SKILL.md
# - File copied to .claude/skills/my-new-skill/SKILL.md
# - Next git commit will include the new skill in .skills/internal/
```

### Scenario 2: Edit Existing Skill in Claude

You make a fix to a skill in the Claude interface:

```bash
# File already exists in all 3 locations
# You edit it in .claude/skills/visual-thinking/SKILL.md

# Run sync
npm run skills:sync

# Result:
# - .claude version has newest mtime
# - File copied from .claude to .cursor (overwriting old version)
# - File copied from .claude to .skills/internal (overwriting old version)
```

### Scenario 3: Delete a Skill

You want to remove an old, unused skill:

```bash
# Delete from canonical source
rm -rf .skills/internal/obsolete-skill

# Run sync
npm run skills:sync

# Result:
# - Detected that file is deleted from .skills/internal
# - File deleted from .cursor/skills/obsolete-skill
# - File deleted from .claude/skills/obsolete-skill
```

### Scenario 4: External Skills Update

Published skills change and you want to deploy:

```bash
# Update source files in skills/skills/
vim skills/skills/elements-composition/SKILL.md

# Generate and sync
npm run skills:full

# Result:
# - skills/SKILL.md processed through generate-skills.ts
# - Output written to skills/skills-generated/
# - Generated files copied to .skills/external/
# - External skills synced to .cursor/skills/ and .claude/skills/
```

## Troubleshooting

### Sync Shows 0 Operations

This means all files in all directories are identical. This is expected if:
- You haven't made any changes since last sync
- All directories were recently synced
- You're on a clean checkout

**Verify sync is working:**
```bash
# Make a change
echo "test" >> .cursor/skills/visual-thinking/SKILL.md

# Run sync - should show 1 copy operation
npm run skills:sync:dry
```

### Files Not Syncing

Check the dry-run output first:

```bash
npm run skills:sync:dry
```

If operations are shown but files aren't updating:

1. Verify file permissions:
   ```bash
   ls -la .cursor/skills/
   ls -la .skills/internal/
   ls -la .claude/skills/
   ```

2. Check for errors in sync log:
   ```bash
   cat .skills/.sync-log.json | jq '.errors'
   ```

3. Try verbose mode:
   ```bash
   npm run skills:sync:verbose
   ```

### Lost Changes

If you accidentally delete a file and want to recover it:

```bash
# Check .sync-log.json to see what was deleted
cat .skills/.sync-log.json

# If backup exists:
ls -la .skills.backup-*/

# Restore from backup
cp -r .skills.backup-2024-02-13-14-30-*/internal/* .skills/internal/
```

### Simultaneous Edits

If two people edit the same file in different locations at the same time:

```bash
# Person A edits .cursor/skills/visual-thinking/SKILL.md (10:00 AM)
# Person B edits .claude/skills/visual-thinking/SKILL.md (10:00 AM)

npm run skills:sync

# Result: Newest mtime wins (whoever finished editing last)
# The other person's changes are overwritten
```

**Prevention:**
- Use git for merging changes
- Commit `.skills/internal/` regularly
- Don't edit in both places simultaneously

## Integration with Git

### Workflow

```bash
# 1. Make changes in any agent directory
vim .cursor/skills/visual-thinking/SKILL.md

# 2. Sync changes
npm run skills:sync

# 3. Commit canonical source
git add .skills/internal/
git commit -m "Update visual-thinking skill documentation"

# 4. Push to remote
git push origin main
```

### What to Commit

**Commit these:**
- `.skills/internal/` - Canonical source of internal skills

**Don't commit these:**
- `.skills/external/` - Generated from `skills/skills-generated/`
- `.skills/.sync-log.json` - Transaction log (gitignored)
- `.skills.backup-*/` - Backup directories (gitignored)
- `.cursor/skills/` - Agent-specific directory (not in repo)
- `.claude/skills/` - Agent-specific directory (not in repo)

### Git Ignore

These are already in `.gitignore`:
```gitignore
.skills/external/        # Generated external skills
.skills/.sync-log.json   # Sync transaction log
.skills.backup-*/        # Backup directories
```

The following should NOT be gitignored:
- `.skills/internal/` - Must be committed as canonical source

## Safety Features

### Dry Run Mode

Preview all changes before applying:

```bash
npm run skills:sync:dry
```

All operations are logged but no files are modified. This is the safest way to see what will happen.

### Automatic Backups

Before any sync operation, a timestamped backup is created:

```bash
.skills.backup-2024-02-13-14-30-45/
├── internal/
│   └── (copy of all internal skills)
└── external/
    └── (copy of all external skills)
```

These backups are gitignored and can be used for recovery.

### Transaction Logs

Every sync creates a detailed log of what happened:

```bash
.skills/.sync-log.json
```

Contents include:
- Timestamp of sync
- All operations performed
- Any conflicts detected
- Error messages
- Summary (copied/deleted/skipped counts)

## Performance

### Speed

Typical sync operations:
- 15 internal skills: < 500ms
- Including external skills: < 2 seconds
- Dry-run only (no changes): < 100ms

### Optimization

The sync system is optimized to skip unchanged files:

1. **Fast path** - If mtime + size match, files are considered identical (skip hash computation)
2. **Medium path** - Only compute content hash if mtime or size differs
3. **Caching** - Hashes are computed once per sync run

## Future Enhancements

Potential improvements being considered:

- **File watcher mode** - Auto-sync on file changes (`--watch`)
- **Git hooks** - Auto-sync on `git checkout` or `git commit`
- **Selective sync** - Sync only specific skills by name
- **Interactive mode** - Prompt user for conflicts
- **Metrics** - Track sync frequency, conflict rate, file churn
- **Compression** - Store backups as tar.gz
- **Lock files** - Prevent concurrent sync operations

## FAQ

**Q: Can I edit skills in multiple locations simultaneously?**
A: Not recommended. The newest mtime always wins, so conflicting edits will be lost. Use git for proper conflict resolution.

**Q: Where should I commit my skill changes?**
A: To `.skills/internal/`. After syncing, the changes are automatically there. Run `git add .skills/internal/` and commit.

**Q: What if I delete a skill by accident?**
A: Check `.skills.backup-*/internal/` for recent backups. Or restore from git history: `git checkout HEAD -- .skills/internal/`

**Q: Do I need to run sync manually?**
A: Currently yes, but future versions will support auto-sync via git hooks or file watchers.

**Q: Why do agent directories exist if `.skills/` is the canonical source?**
A: Cursor and Claude don't support symlinks, so we need real directories. The sync system keeps them automatically updated.

**Q: Can I have agent-specific skills?**
A: No, the sync system ensures all agents have identical internal skills. Use `.skills/internal/` for shared skills only.

**Q: What's the difference between internal and external skills?**
A: **Internal skills** are Editframe-specific (monorepo setup, profiling, etc.). **External skills** are published for general use (elements-composition, API docs, etc.) and are generated from `skills/skills/`.
