# Documentation Quality Patterns

Detailed templates for each pattern. Variables use `{{PLACEHOLDER}}` syntax.

---

## Pattern 1: Single Source of Truth for API Documentation

### Problem Definition
API documentation exists in multiple locations requiring manual sync:
- `{{SOURCE_CODE_PATH}}` - Implementation with inline annotations
- `{{INTERMEDIATE_DEFINITION_PATH}}` - Manually maintained data structures
- `{{DOCUMENTATION_PATH}}` - Prose content re-describing same information

### Detection Criteria
- Same information (names, types, descriptions) in 2+ files
- Changes to source require manual doc updates
- Observable drift (casing differences, missing items, stale descriptions)

### Solution

**Step 1: Enhance source annotations**

```
BEFORE:
{{EXISTING_ANNOTATION_PATTERN}}

AFTER:
{{ENHANCED_ANNOTATION_PATTERN}}

Required tags:
- {{TAG_DEFAULT_VALUE}} - Default value
- {{TAG_CATEGORY}} - Logical grouping
- {{TAG_ACCESS}} - Read/Write/ReadWrite
- {{TAG_USE_CASE}} - Primary use case description
- {{TAG_DOM_ATTRIBUTE}} - HTML attribute name
```

**Step 2: Create extraction script**

```
Location: {{SCRIPTS_DIR}}/generate-{{ARTIFACT_TYPE}}-docs.{{EXT}}

Input: {{SOURCE_CODE_GLOB}}
Output: {{GENERATED_DATA_DIR}}/{{ARTIFACT_TYPE}}.json

Schema:
{
  "{{ARTIFACT_NAME}}": {
    "properties": [{
      "name": "{{PROP_NAME}}",
      "type": "{{PROP_TYPE}}",
      "defaultValue": "{{DEFAULT}}",
      "category": "{{CATEGORY}}",
      "access": "{{ACCESS}}",
      "useCase": "{{USE_CASE}}",
      "domAttribute": "{{DOM_ATTR}}"
    }]
  }
}
```

**Step 3: Delete intermediate files**
```
DELETE: {{INTERMEDIATE_DEFINITION_GLOB}}
```

**Step 4: Create rendering component**
```
Location: {{COMPONENTS_DIR}}/Generated{{ARTIFACT_TYPE}}Reference.{{COMPONENT_EXT}}

Props:
- {{ARTIFACT_IDENTIFIER}}: which item to render

Behavior: Load generated JSON, filter, render using {{EXISTING_DOC_COMPONENT}}
```

**Step 5: Simplify documentation**
```
BEFORE: {{MANUAL_LINE_COUNT}}+ lines
{{MANUAL_CONTENT_EXAMPLE}}

AFTER: {{REDUCED_LINE_COUNT}} lines
<{{GENERATED_COMPONENT}} {{ARTIFACT_IDENTIFIER}}="{{VALUE}}" />
```

---

## Pattern 2: Flatten Deep Navigation Hierarchy

### Problem Definition
Navigation requires `{{CURRENT_DEPTH}}` levels:
`{{LEVEL_1}} → {{LEVEL_2}} → {{LEVEL_3}} → {{LEVEL_4}}`

### Detection Criteria
- Depth exceeds `{{MAX_DEPTH}}` levels (recommended: 2-3)
- Index pages with no content, only links
- Folders serve as taxonomy only

### Solution

**Step 1: Flatten structure**
```
BEFORE:
{{PARENT_DIR}}/
├── {{CATEGORY_DIR}}/
│   ├── {{SUBCATEGORY_1}}/
│   │   └── {{CONTENT_FILE}}
│   ├── {{SUBCATEGORY_2}}/
│   │   ├── {{CONTENT_A}}
│   │   └── {{CONTENT_B}}

AFTER:
{{PARENT_DIR}}/
├── {{CATEGORY_DIR}}/
│   ├── {{FLAT_FILE_1}}
│   ├── {{FLAT_FILE_2}}
│   └── {{FLAT_FILE_3}}
```

**Step 2: Add categorization frontmatter**
```yaml
---
{{DOC_TYPE_FIELD}}: {{CATEGORY_VALUE}}
{{RELATED_FIELD}}:
  - {{RELATED_PATH_1}}
  - {{RELATED_PATH_2}}
---
```

**Step 3: Update navigation builder**
```
Location: {{NAV_BUILDER_PATH}}

BEFORE: Group by folder structure
AFTER: Group by {{DOC_TYPE_FIELD}} value
```

---

## Pattern 3: Replace Numeric Ordering Prefixes

### Problem Definition
Files use prefixes for ordering: `{{PREFIX_PATTERN}}` (e.g., `010-`, `020-`)

### Detection Criteria
- Names match `{{PREFIX_REGEX}}` (e.g., `/^\d{2,3}-/`)
- Ordering by filename sort
- Prefixes appear in URLs

### Solution

**Step 1: Add ordering frontmatter**
```yaml
{{ORDER_FIELD}}: {{ORDER_VALUE}}
```

**Step 2: Rename files**
```
BEFORE: {{PREFIX}}{{NAME}}.{{EXT}}
AFTER: {{NAME}}.{{EXT}}
```

**Step 3: Update slug generation**
```
Location: {{SLUG_GENERATOR_PATH}}
Change: Strip {{PREFIX_REGEX}} from slugs
```

**Step 4: Update sorting**
```
Location: {{SORT_FUNCTION_PATH}}

BEFORE: items.sort((a, b) => a.filename.localeCompare(b.filename))
AFTER: items.sort((a, b) => 
  (a.frontmatter.{{ORDER_FIELD}} ?? {{DEFAULT}}) - 
  (b.frontmatter.{{ORDER_FIELD}} ?? {{DEFAULT}})
)
```

---

## Pattern 4: Eliminate Duplicate Content

### Problem Definition
Identical content at:
- `{{PATH_A}}`
- `{{PATH_B}}`

### Detection Criteria
- Content >{{SIMILARITY_THRESHOLD}}% identical
- Same topic under different navigation paths
- Changes require multiple file edits

### Solution

**Option A: Delete duplicate**
```
DELETE: {{PATH_B}}
KEEP: {{PATH_A}}
UPDATE: Links pointing to {{PATH_B}} → {{PATH_A}}
```

**Option B: Extract shared partial**
```
CREATE: {{PARTIALS_DIR}}/{{SHARED_NAME}}.{{EXT}}

MODIFY {{PATH_A}}:
{{IMPORT_SYNTAX}}
{{INCLUDE_SYNTAX}}

MODIFY {{PATH_B}}:
{{IMPORT_SYNTAX}}
{{INCLUDE_SYNTAX}}
```

---

## Pattern 5: Create Reusable UI Component

### Problem Definition
Repeated inline pattern:
```
{{REPEATED_PATTERN}}
```
Appears in {{COUNT}} locations across {{FILE_COUNT}} files.

### Detection Criteria
- Same inline styles/classes in 3+ files
- Pattern has semantic meaning (warning, info, tip)
- Style changes require multi-file edits

### Solution

**Step 1: Create component**
```
Location: {{COMPONENTS_DIR}}/{{COMPONENT_NAME}}.{{EXT}}

interface {{COMPONENT_NAME}}Props {
  {{VARIANT_PROP}}: {{VARIANT_TYPE}};
  {{TITLE_PROP}}?: string;
  {{CONTENT_PROP}}: {{CONTENT_TYPE}};
}

const styles = {
  {{VARIANT_A}}: '{{STYLES_A}}',
  {{VARIANT_B}}: '{{STYLES_B}}',
};
```

**Step 2: Register component**
```
Location: {{REGISTRY_PATH}}
ADD: {{COMPONENT_NAME}}: (props) => <{{COMPONENT_NAME}} {...props} />,
```

**Step 3: Replace occurrences**
```
BEFORE:
{{REPEATED_PATTERN}}

AFTER:
<{{COMPONENT_NAME}} {{VARIANT_PROP}}="{{VARIANT}}" {{TITLE_PROP}}="{{TITLE}}">
  {{CONTENT}}
</{{COMPONENT_NAME}}>
```

---

## Pattern 6: Add Missing Documentation Category

### Problem Definition
No documentation for `{{MISSING_CATEGORY}}`:
- Users ask `{{QUESTION_PATTERN}}`
- Support tickets show `{{ISSUE_PATTERN}}`
- Gap in taxonomy

### Detection Criteria
- Support data shows recurring questions
- Comparable products document this category
- Docs reference undefined concepts

### Solution

**Step 1: Create structure**
```
{{DOCS_ROOT}}/{{CATEGORY_SLUG}}/
├── index.{{EXT}}
├── {{TOPIC_1}}.{{EXT}}
├── {{TOPIC_2}}.{{EXT}}
└── {{TOPIC_N}}.{{EXT}}
```

**Step 2: Index page template**
```markdown
---
{{TITLE_FIELD}}: {{CATEGORY_TITLE}}
{{DESC_FIELD}}: {{CATEGORY_DESC}}
{{TYPE_FIELD}}: {{CATEGORY_TYPE}}
{{ORDER_FIELD}}: {{ORDER}}
---

## {{CATEGORY_TITLE}}

{{OVERVIEW}}

### Topics

{{TOPIC_LINKS}}
```

**Step 3: Topic page template**
```markdown
---
{{TITLE_FIELD}}: {{TOPIC_TITLE}}
{{TYPE_FIELD}}: {{CATEGORY_TYPE}}
---

## {{TOPIC_TITLE}}

### Symptoms
{{SYMPTOMS}}

### Cause
{{CAUSE}}

### Solution
{{SOLUTION}}

### Related
{{RELATED_LINKS}}
```

---

## Pattern 7: Complete Code Examples

### Problem Definition
Code fragments require assembly:
```
{{FRAGMENT_EXAMPLE}}
```

### Detection Criteria
- Examples lack imports/boilerplate
- Multiple snippets must combine to function
- "Try it" prompts have no runnable code

### Solution

**Step 1: Create expandable component**
```
Location: {{COMPONENTS_DIR}}/{{EXAMPLE_COMPONENT}}.{{EXT}}

interface Props {
  {{TITLE_PROP}}?: string;
  {{EXPANDED_PROP}}?: boolean;
  {{CONTENT_PROP}}: {{CONTENT_TYPE}};
}
```

**Step 2: Create complete templates**
```
{{TEMPLATES_DIR}}/{{FRAMEWORK}}/
├── minimal.{{TEMPLATE_EXT}}
├── with-controls.{{TEMPLATE_EXT}}
└── production.{{TEMPLATE_EXT}}

Template structure:
{{HEADER}}
{{IMPORTS_PLACEHOLDER}}
{{BOILERPLATE_START}}
{{CODE_PLACEHOLDER}}
{{BOILERPLATE_END}}
```

**Step 3: Add to documentation**
```markdown
{{FRAGMENT_CODE}}

<{{EXAMPLE_COMPONENT}} {{TITLE_PROP}}="{{TITLE}}">
{{COMPLETE_RUNNABLE_CODE}}
</{{EXAMPLE_COMPONENT}}>
```

---

## Pattern 8: Document Assumed Knowledge

### Problem Definition
`{{UNDOCUMENTED_TERM}}` used without explanation in {{COUNT}} locations.

### Detection Criteria
- Technical term/format without definition
- Custom syntax specific to project
- Search yields no explanatory results

### Solution

**Step 1: Create concept page**
```
Location: {{CONCEPTS_DIR}}/{{CONCEPT_SLUG}}.{{EXT}}

---
{{TITLE_FIELD}}: {{CONCEPT_NAME}}
{{DESC_FIELD}}: {{BRIEF_DESC}}
---

## {{CONCEPT_NAME}}

{{DEFINITION}}

### Format
{{FORMAT_SPEC}}

### Examples
{{EXAMPLES}}

### Conversion
{{CONVERSION_CODE}}
```

**Step 2: Update type rendering**
```
Location: {{TYPE_RENDERER_PATH}}

ADD: if (type === "{{CONCEPT_TYPE}}") {
  return {{LINK_WITH_TOOLTIP}};
}
```

**Step 3: Add inline links**
```
BEFORE: {{PROP}}: {{CONCEPT_TYPE}}
AFTER: {{PROP}}: [{{CONCEPT_TYPE}}]({{CONCEPT_PATH}})
```

---

## Pattern 9: Multiple Integration Paths

### Problem Definition
Only `{{PRIMARY_METHOD}}` documented.
Alternatives undocumented: `{{ALT_A}}`, `{{ALT_B}}`

### Detection Criteria
- Single installation/setup method
- Users request alternatives
- Comparable products offer multiple paths

### Solution

```markdown
<{{TAB_GROUP}} {{STATE_KEY}}="{{KEY}}">
  <{{TAB}} {{LABEL}}="{{PRIMARY_LABEL}}">
    {{PRIMARY_CONTENT}}
  </{{TAB}}>
  
  <{{TAB}} {{LABEL}}="{{ALT_LABEL}}">
    {{ALT_CONTENT}}
    
    <{{CALLOUT}} {{VARIANT}}="{{WARNING_VARIANT}}">
      {{LIMITATIONS}}
    </{{CALLOUT}}>
  </{{TAB}}>
</{{TAB_GROUP}}>
```

---

## Pattern 10: Bidirectional Code Editing

### Problem Definition
Code demo has {{VIEW_COUNT}} views. Only `{{VIEW_A}}` editable.
`{{VIEW_B}}` shows "read only" without explanation.

### Detection Criteria
- Multiple code representations of same content
- One editable, others read-only
- Users expect to edit preferred format

### Solution

**Option A: Enable sync**
```javascript
const [{{VIEW_A_STATE}}, {{SET_A}}] = useState({{INIT_A}});
const [{{VIEW_B_STATE}}, {{SET_B}}] = useState({{INIT_B}});

// A → B sync
useEffect(() => {
  {{SET_B}}({{CONVERT_A_TO_B}}({{VIEW_A_STATE}}));
}, [{{VIEW_A_STATE}}]);

// B → A sync
const handle{{VIEW_B}}Change = (code) => {
  {{SET_B}}(code);
  {{SET_A}}({{CONVERT_B_TO_A}}(code));
};
```

**Option B: Explain read-only**
```jsx
<{{TAB}} {{LABEL}}="{{VIEW_B_LABEL}}">
  <{{EXPLANATION}}>{{READ_ONLY_REASON}}</{{EXPLANATION}}>
  <{{EDITOR}} {{READONLY}}={true} ... />
</{{TAB}}>
```

---

## Variable Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `{{SOURCE_CODE_PATH}}` | Implementation files | `src/elements/*.ts` |
| `{{INTERMEDIATE_DEFINITION_PATH}}` | Manual data files | `docs/*-properties.ts` |
| `{{DOCUMENTATION_PATH}}` | Prose docs | `content/**/*.mdx` |
| `{{GENERATED_DATA_DIR}}` | Generated output | `content/_generated/` |
| `{{COMPONENTS_DIR}}` | UI components | `app/components/docs/` |
| `{{DOC_TYPE_FIELD}}` | Categorization field | `docType` |
| `{{ORDER_FIELD}}` | Sort order field | `order` |
| `{{PREFIX_REGEX}}` | Numeric prefix pattern | `/^\d{2,3}-/` |
| `{{REGISTRY_PATH}}` | Component registration | `DocsPage.tsx` |
