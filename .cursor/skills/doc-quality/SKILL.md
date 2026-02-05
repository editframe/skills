---
name: doc-quality
description: Analyze and improve documentation quality using systematic patterns. Use when reviewing documentation, planning documentation improvements, or when the user mentions docs, documentation structure, API references, or content duplication.
---

# Documentation Quality Analysis

Systematic patterns for identifying and fixing documentation problems.

## Workflow

1. **Map Documentation Tree** - Build complete structure map with depth measurements
2. **Verify Property Requirements** - Check property accuracy (MUST fix if any fail)
3. **Verify Structural Requirements** - Check hierarchy/organization (MUST fix if any fail)
4. **Score Quality Dimensions** - Evaluate with concrete metrics (fix if score low)
5. **Fix** - Apply fixes in priority order
6. **Re-verify** - Confirm all requirements pass

---

## Part 1: Documentation Tree Mapping

Before any assessment, build a complete map of the documentation structure.

### Tree Mapping Process

1. Starting from docs root, walk all directories recursively
2. For each path, record:
   - Full path
   - Depth from root (count `/` separators)
   - Whether it's an index page
   - Whether index has substantive content or just links
3. Calculate aggregate metrics

### Tree Map Output Format

```markdown
## Documentation Tree Map

Root: {{DOCS_ROOT}}
Total files: {{FILE_COUNT}}
Total directories: {{DIR_COUNT}}
Max depth: {{MAX_DEPTH}}
Deepest path: {{DEEPEST_PATH}}

### Depth Distribution
| Depth | Count | Example Path |
|-------|-------|--------------|
| 1 | 5 | /getting-started |
| 2 | 12 | /elements/video |
| 3 | 28 | /elements/video/tutorial |
| 4 | 15 | /elements/video/explanation/jit-transcoding |

### Index Pages Analysis
| Path | Has Content | Content Type |
|------|-------------|--------------|
| /elements/index.mdx | Yes | Overview + links |
| /elements/video/explanation/index.mdx | No | Links only |
```

---

## Part 2: Property Requirements (Pass/Fail)

These are **non-negotiable**. Documentation fails if ANY requirement is not met.

### Requirement P1: Complete Property Coverage
Every `@property()` in source MUST be documented. Zero tolerance for missing properties.

```
PASS: All N source properties have documentation
FAIL: X of N properties missing documentation
```

### Requirement P2: No Phantom Properties
Documentation MUST NOT contain properties that don't exist in source.

```
PASS: All documented properties exist in source
FAIL: X properties documented but not in source
```

### Requirement P3: Type Accuracy
Documented types MUST match source exactly.

```
PASS: All types match
FAIL: propX documented as "string", source is "number"
```

### Requirement P4: Default Value Accuracy
Documented defaults MUST match source exactly (if defaults are documented).

```
PASS: All defaults match OR defaults not documented
FAIL: propX documented default "10", source default is "100"
```

### Requirement P5: Attribute Name Accuracy
HTML attribute names MUST match source exactly (including casing).

```
PASS: All attribute names match
FAIL: docs say "trimStart", source says "trimstart"
```

---

## Part 3: Structural Requirements (Pass/Fail)

These are **non-negotiable**. Documentation fails if ANY requirement is not met.

### Requirement S1: Navigation Depth ≤ 3 Levels
No content should be more than 3 clicks from the docs root.

```
Measurement: Count directory depth from docs root to content file
Threshold: MAX_DEPTH ≤ 3

PASS: Deepest content at depth 3 (e.g., /elements/video/tutorial.mdx)
FAIL: Content at depth 4+ (e.g., /elements/video/explanation/jit-transcoding.mdx)

Counting method:
- Depth 1: /getting-started.mdx
- Depth 2: /elements/video.mdx
- Depth 3: /elements/video/tutorial.mdx
- Depth 4: /elements/video/explanation/jit-transcoding.mdx ← VIOLATION
```

### Requirement S2: No Taxonomy-Only Folders
Every folder must contain substantive content, not just serve as a category container.

```
Detection: Index page exists but contains ONLY:
- A title/heading
- Links to child pages
- No explanatory prose, examples, or documentation value

PASS: All index pages have substantive content (overview, context, guidance)
FAIL: X folders exist only to group children with no standalone value
```

### Requirement S3: No Duplicate Content Paths
The same content should not be reachable via multiple navigation paths.

```
Detection: 
- Same content duplicated in multiple locations
- Symlinks or includes creating multiple paths to identical content
- >80% text similarity between pages

PASS: Each piece of content has exactly one canonical location
FAIL: X pages have duplicate/near-duplicate content
```

### Requirements Output Format

```markdown
## Requirements Check

### Property Requirements
| Requirement | Status | Details |
|-------------|--------|---------|
| P1: Complete Coverage | PASS/FAIL | X of Y properties documented |
| P2: No Phantoms | PASS/FAIL | X phantom properties found |
| P3: Type Accuracy | PASS/FAIL | X type mismatches |
| P4: Default Accuracy | PASS/FAIL | X default mismatches |
| P5: Attribute Accuracy | PASS/FAIL | X attribute mismatches |

### Structural Requirements
| Requirement | Status | Details |
|-------------|--------|---------|
| S1: Nav Depth ≤ 3 | PASS/FAIL | Max depth: X, Y paths exceed limit |
| S2: No Taxonomy-Only | PASS/FAIL | X empty index pages found |
| S3: No Duplicates | PASS/FAIL | X duplicate content paths found |

**Result:** [ALL PASS] OR [FAIL - must fix: list]
```

---

## Part 4: Source Verification Process

### Finding Source Properties

1. Locate element: `{{SOURCE_PATH}}/{{ELEMENT_NAME}}.ts`
2. Find `@property()` decorators
3. Check parent class (`extends`) for inherited properties
4. Extract for each property:
   - Name (JS property name)
   - Type (from decorator or TypeScript)
   - Default value (from initialization)
   - Attribute name (from `attribute:` in decorator)
   - Description (from JSDoc comment)

### Verification Output

```markdown
## Source Verification: {{ELEMENT_NAME}}

Source: {{SOURCE_FILE_PATH}}
Docs: {{DOCS_FILE_PATH}}

### Source Properties (N total)
| Property | Type | Default | Attribute | From |
|----------|------|---------|-----------|------|
| propA | number | 10 | prop-a | EFVideo |
| propB | boolean | false | prop-b | EFMedia (inherited) |

### Documentation Properties (M total)
| Property | Type | Default | Attribute |
|----------|------|---------|-----------|
| propA | number | 10 | prop-a |

### Discrepancies
| Property | Field | Source | Docs | Action |
|----------|-------|--------|------|--------|
| propX | type | number | string | Fix type |
| propY | default | 100 | 10 | Fix default |

### Missing from Docs (must add)
- propC (type: string, default: "", attribute: prop-c)

### Phantom Properties (must remove)
- propZ (not in source)
```

---

## Part 5: Quality Dimensions (Scored)

Only evaluate AFTER all requirements pass. Each dimension has **concrete, measurable criteria**.

### Dimension Q1: Code Examples (0-2 points)

| Score | Criteria | Detection |
|-------|----------|-----------|
| 0 | None or broken | No code blocks, or code has syntax errors |
| 1 | Fragments | Code blocks exist but lack imports, setup, or context needed to run |
| 2 | Complete | Code is copy-paste runnable with all imports and setup included |

**Measurement:** For each code example, check:
- Has import statements? 
- Has necessary boilerplate/setup?
- Would it run if pasted into a fresh file?

### Dimension Q2: Information Density (0-2 points)

| Score | Criteria | Detection |
|-------|----------|-----------|
| 0 | Sparse | >50% of pages are <200 words or mostly links |
| 1 | Adequate | 20-50% of pages are thin |
| 2 | Dense | <20% of pages are thin; most have substantive content |

**Measurement:** For each page, count:
- Word count (excluding code blocks)
- Ratio of prose to links/navigation
- Pages with <200 words of prose = "thin"

### Dimension Q3: Terminology Consistency (0-2 points)

| Score | Criteria | Detection |
|-------|----------|-----------|
| 0 | Inconsistent | Same concept has 3+ different names across docs |
| 1 | Minor issues | Same concept has 2 names, or casing varies |
| 2 | Consistent | Each concept has exactly one name used everywhere |

**Measurement:** Search for known term variations:
- "trim" vs "clip" vs "cut"
- "timegroup" vs "time group" vs "TimeGroup"
- "element" vs "component" vs "widget"

### Quality Score Output

```markdown
## Quality Score

| Dimension | Score | Evidence |
|-----------|-------|----------|
| Q1: Code Examples | X/2 | Y of Z examples are runnable |
| Q2: Information Density | X/2 | Y% of pages are thin |
| Q3: Terminology | X/2 | Found N term variations |

**Total: X/6** (Threshold: 4/6 to pass)
```

---

## Part 6: Fix Priority

1. **First:** Fix structural requirement failures (S1-S3)
   - These affect all users navigating docs
   - See [patterns.md](patterns.md) Pattern 2 for flattening hierarchy
   
2. **Second:** Fix property requirement failures (P1-P5)
   - These cause incorrect API usage
   
3. **Third:** Fix lowest-scoring quality dimensions (if < 4/6)
   - Prioritize dimensions scoring 0

### Fix: Navigation Too Deep (S1)
1. Identify paths at depth 4+
2. Flatten by merging category folders with content
3. Use frontmatter `docType` field for categorization instead of folders
4. Update navigation builder to group by frontmatter, not folder structure

### Fix: Taxonomy-Only Folders (S2)
1. Add substantive overview content to empty index pages, OR
2. Eliminate the folder level entirely by flattening

### Fix: Missing Properties (P1)
1. Add property to documentation
2. Use JSDoc description from source as starting point

### Fix: Phantom Properties (P2)
1. Remove from documentation entirely

### Fix: Type/Default/Attribute Mismatches (P3-P5)
1. Update documentation to match source exactly

---

## Stop Criteria

**STOP and report success when:**
- All 8 requirements PASS (P1-P5, S1-S3)
- Quality score ≥ 4/6

**STOP and escalate when:**
- Source code unclear
- Structural changes require navigation system changes
- Changes would require code changes

---

## Detailed Patterns

For solution templates (hierarchy flattening, duplicate elimination, component extraction), see [patterns.md](patterns.md).
