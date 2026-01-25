# LLM Profiling Guide

Quick reference for LLM agents optimizing performance using CPU profiles.

## Quick Command

```bash
./scripts/ef profile <sandbox> <scenario> --json
```

Output is structured JSON optimized for programmatic analysis.

## JSON Output Structure

```json
{
  "sandbox": "EFCanvas",
  "scenario": "basic",
  "durationMs": 145.23,
  "samples": 1452,
  "hotspots": [
    {
      "rank": 1,
      "functionName": "updateFrame",
      "file": "EFTimegroup.ts",
      "line": 234,
      "selfTimeMs": 45.2,
      "selfTimePct": 31.1,
      "callCount": 234
    }
  ],
  "byFile": [
    { "file": "EFTimegroup.ts", "timeMs": 82.1, "timePct": 56.5 }
  ],
  "recommendations": [
    "• updateFrame @ EFTimegroup.ts:234 takes 31.1% (called 234 times) - consider optimization"
  ],
  "patterns": [
    {
      "name": "Hot Loop Detected",
      "severity": "high",
      "suggestion": "Review loop logic..."
    }
  ]
}
```

## Optimization Workflow

### 1. Capture Profile

```bash
./scripts/ef profile EFCanvas basic --json > profile.json
```

### 2. Parse JSON

Extract key insights:
- **hotspots[0-4]**: Top 5 functions by self time
- **hotspots[].selfTimePct**: Percentage of total time
- **hotspots[].callCount**: How many times called
- **byFile**: Which files are most expensive
- **recommendations**: Automated suggestions
- **patterns** (with --verbose): Detected anti-patterns

### 3. Prioritize

Focus on:
1. Functions with `selfTimePct > 15%`
2. Functions with `callCount > 100` and `selfTimePct > 5%`
3. Files with `timePct > 40%`
4. Patterns with `severity: "high"`

### 4. Optimize

Common optimizations by pattern:

**High selfTimePct + high callCount** → Cache or memoize
```typescript
// Before
function expensiveCalculation(x) {
  return /* complex math */;
}

// After
const cache = new Map();
function expensiveCalculation(x) {
  if (cache.has(x)) return cache.get(x);
  const result = /* complex math */;
  cache.set(x, result);
  return result;
}
```

**High hitCount (>200), low selfTimePct (<10%)** → In tight loop, optimize loop
```typescript
// Before
for (let i = 0; i < items.length; i++) {
  processItem(items[i]); // Called many times
}

// After
const len = items.length; // Cache length
for (let i = 0; i < len; i++) {
  processItem(items[i]);
}
```

**DOM manipulation pattern** → Batch updates
```typescript
// Before
for (const item of items) {
  container.appendChild(createItem(item)); // Layout thrashing
}

// After
const fragment = document.createDocumentFragment();
for (const item of items) {
  fragment.appendChild(createItem(item));
}
container.appendChild(fragment); // Single reflow
```

**Layout thrashing pattern** → Separate reads and writes
```typescript
// Before (interleaved reads/writes)
element1.style.height = element2.offsetHeight + 'px'; // Read, write
element2.style.width = element1.offsetWidth + 'px';   // Read, write

// After (batched reads, then writes)
const h2 = element2.offsetHeight; // Read
const w1 = element1.offsetWidth;  // Read
element1.style.height = h2 + 'px'; // Write
element2.style.width = w1 + 'px';  // Write
```

### 5. Validate

```bash
# Save baseline
./scripts/ef profile EFCanvas basic --save .profiles/baseline.cpuprofile

# After changes
./scripts/ef profile EFCanvas basic --baseline .profiles/baseline.cpuprofile --json
```

Check the comparison output:
```json
{
  "summary": "Duration: -23.4ms (-16.1%)",
  "hasRegression": false,
  "changes": [
    {
      "functionName": "updateFrame",
      "selfTimeDiffMs": -15.3,  // Negative = improvement!
      "selfTimeDiffPct": -10.5
    }
  ]
}
```

Negative values = performance improvement ✅
Positive values = performance regression ⚠️

## Common Hotspot Patterns

### Pattern: Function at Top of Hotspots

```json
{
  "rank": 1,
  "functionName": "processElements",
  "selfTimePct": 35.2,
  "callCount": 1
}
```

**Action:** This function does a lot of work. Review implementation:
- Can work be cached?
- Can complexity be reduced?
- Can work be deferred?

### Pattern: Many Calls, Low Individual Cost

```json
{
  "rank": 5,
  "functionName": "getValue",
  "selfTimePct": 12.3,
  "callCount": 456
}
```

**Action:** Called frequently. Consider:
- Memoization (if pure function)
- Caching with invalidation (if not pure)
- Reducing call sites (inlining, batching)

### Pattern: File Dominates

```json
{
  "byFile": [
    { "file": "EFTimegroup.ts", "timePct": 67.8 }
  ]
}
```

**Action:** Review entire file architecture:
- Is work being duplicated?
- Can initialization be optimized?
- Should work be split across files?

## Advanced: Pattern Detection

Use `--verbose` flag for anti-pattern detection:

```bash
./scripts/ef profile EFCanvas basic --json --verbose > profile-verbose.json
```

Additional output:
```json
{
  "patterns": [
    {
      "name": "Excessive DOM Manipulation",
      "severity": "high",
      "description": "DOM operations account for 23.4%",
      "suggestion": "Consider batching DOM updates or using DocumentFragment",
      "hotspots": [...]
    }
  ]
}
```

React to patterns:
- **Excessive DOM Manipulation** → Use DocumentFragment or virtual DOM
- **Layout Thrashing** → Separate layout reads from writes
- **Hot Loop** → Optimize loop body or reduce iterations
- **Death by a Thousand Cuts** → Add memoization or caching
- **Heavy JSON Operations** → Use structured cloning or reduce serialization
- **Frequent Style Computation** → Cache computed styles
- **Animation API Overhead** → Cache animation objects
- **File-Level Issue** → Architectural review needed

## Example: Complete Optimization Session

```bash
# 1. Initial profile
./scripts/ef profile EFTimegroup playback --json > before.json

# Analysis shows:
# - updateFrame: 45.2ms (31.1%), called 234 times
# - Recommendation: consider caching

# 2. Add caching
# [LLM makes code changes to add memoization]

# 3. Verify improvement
./scripts/ef profile EFTimegroup playback \
  --baseline .profiles/before.cpuprofile \
  --json > after.json

# Output shows:
# {
#   "summary": "Duration: -18.3ms (-12.6%)",
#   "changes": [
#     { "functionName": "updateFrame", "selfTimeDiffMs": -15.2 }
#   ]
# }

# ✅ Success! 12.6% faster
```

## Interpreting Metrics

### Self Time vs Total Time

- **selfTimeMs**: Time in the function itself (excluding callees)
- **totalTimeMs**: Time in function + all callees
- **selfTimePct**: Percentage of total profile time

**Optimize self time first** - direct impact, no dependencies.

### Hit Count vs Call Count

- **hitCount**: How many profile samples caught this function
- **callCount**: How many times function appeared in call stacks

**High hitCount** = function is running (in tight loop or long-running)
**High callCount** = function is called frequently (good caching target)

### Percentages

- **>30%**: Critical bottleneck - must optimize
- **15-30%**: Significant cost - should optimize
- **5-15%**: Moderate cost - consider optimizing
- **<5%**: Minor cost - low priority

## Tips for LLMs

1. **Start with top 3 hotspots** - biggest impact
2. **Look for callCount > 50** - memoization candidates
3. **Check file-level patterns** - might need architectural changes
4. **Use patterns for diagnosis** - they suggest specific fixes
5. **Always validate** - compare before/after profiles
6. **Watch for regressions** - ensure changes don't make things worse
7. **Focus on self time** - total time includes callees
8. **Consider call graphs** - optimization in caller might help

## Output Formats

**Text (human-readable):**
```bash
./scripts/ef profile EFCanvas basic
```

**JSON (machine-readable):**
```bash
./scripts/ef profile EFCanvas basic --json
```

**JSON with patterns:**
```bash
./scripts/ef profile EFCanvas basic --json --verbose
```

**Comparison:**
```bash
./scripts/ef profile EFCanvas basic --baseline baseline.cpuprofile --json
```

## Integration with Tests

Save profiles during test runs:
```bash
./scripts/ef run EFCanvas --profile --output .profiles/
```

This creates `.profiles/EFCanvas-scenario-timestamp.cpuprofile` for each scenario.

Compare against saved profiles:
```bash
./scripts/ef profile EFCanvas basic --baseline .profiles/EFCanvas-basic-timestamp.cpuprofile
```

## Troubleshooting

**"No hotspots found"**
- Scenario may be too fast (< 10ms)
- Try longer-running scenarios
- Check that profiling was actually enabled

**"Profile data is empty"**
- CDP profiler not started correctly
- Check browser is controlled by Playwright (`ef open`)
- Verify profiling checkbox is enabled

**"Source locations incorrect"**
- Source maps not loading correctly
- Check browser DevTools Sources tab
- Vite dev server should include source maps automatically

**"Call counts seem wrong"**
- Call count is approximate based on call stack traversal
- Recursive functions may have unusual counts
- Use hitCount for sampling-based frequency instead
