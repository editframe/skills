# CPU Profiling Guide

## Overview

The elements package includes comprehensive CPU profiling infrastructure optimized for both human and LLM analysis. The system uses Chrome DevTools Protocol (CDP) to capture and analyze JavaScript execution profiles.

## Quick Start

### Profile a Scenario (CLI)

```bash
# Basic profiling
./scripts/ef profile EFCanvas basic

# With JSON output (for LLM consumption)
./scripts/ef profile EFCanvas basic --json

# Compare against baseline
./scripts/ef profile EFCanvas basic --baseline .profiles/baseline.cpuprofile

# Save profile for later analysis
./scripts/ef profile EFCanvas basic --save .profiles/EFCanvas-basic.cpuprofile
```

### Profile in Browser (Interactive)

```bash
# Open sandbox with profiling enabled
./scripts/ef open EFCanvas

# In browser UI:
# 1. Check "Enable Profiling" checkbox
# 2. Select scenario from list
# 3. Click "▶ Run" button
# 4. View hotspots in profile panel below
# 5. Download .cpuprofile for Chrome DevTools analysis
```

## Unified Profiling Library

Location: `packages/elements/src/profiling/`

### Core Modules

**analyzer.ts** - Profile analysis functions
- `analyzeProfile()` - Comprehensive analysis with hotspots, file aggregation
- `getHotspots()` - Extract top functions by self time
- `calculateSelfTime()`, `calculateTotalTime()` - Time calculations
- `buildCallTree()` - Reconstruct call hierarchy
- `aggregateByFile()` - Sum time by source file

**formatter.ts** - Output formatting (text and JSON)
- `formatProfileAnalysis()` - Human-readable text output
- `formatProfileAnalysisJSON()` - Structured JSON for LLM consumption
- `formatProfileComparison()` - Text diff output
- `generateRecommendations()` - Auto-generate optimization suggestions

**comparator.ts** - Profile comparison and regression detection
- `compareProfiles()` - Diff two profiles with thresholds
- `hasRegression()` - Check if comparison shows regression
- `getRegressionSummary()` - Extract regression details

**assertions.ts** - Performance testing assertions
- `checkProfileAssertions()` - Validate profiles against expectations
- Supports: `topHotspot`, `notInTopN`, `maxPercentage`, `maxSelfTime`

**types.ts** - Shared TypeScript interfaces

**source-maps.ts** - Source map resolution
- `resolveSourceLocation()` - Basic Vite chunk resolution
- `SourceMapResolver` - Full source map support via @jridgewell/trace-mapping

### Example: Analyze Profile

```typescript
import { analyzeProfile, formatProfileAnalysis } from "@editframe/elements/profiling";

const profile: CPUProfile = JSON.parse(fs.readFileSync("profile.cpuprofile", "utf-8"));

const analysis = analyzeProfile(profile, {
  filterNodeModules: true,
  filterInternals: true,
  topN: 20,
});

console.log(formatProfileAnalysis(analysis, { sandbox: "EFCanvas", scenario: "basic" }));
```

### Example: Compare Profiles

```typescript
import { analyzeProfile, compareProfiles, formatProfileComparison } from "@editframe/elements/profiling";

const current = analyzeProfile(currentProfile);
const baseline = analyzeProfile(baselineProfile);

const comparison = compareProfiles(current, baseline, {
  maxDurationIncreaseMs: 10,
  maxHotspotIncreasePercent: 20,
});

console.log(formatProfileComparison(comparison));

if (hasRegression(comparison)) {
  console.error("Performance regression detected!");
  process.exit(1);
}
```

## CLI Commands

### ef profile

Main CLI profiling command with standardized output.

```bash
ef profile <sandbox> <scenario> [options]
```

**Options:**
- `--json` - Output as JSON for LLM consumption
- `--baseline <file>` - Compare against baseline
- `--save <file>` - Save raw .cpuprofile
- `--top <n>` - Show top N hotspots (default: 20)
- `--verbose` - Show detailed analysis

**Output Format (Text):**
```
=== PROFILE ANALYSIS ===
Sandbox: EFCanvas / Scenario: basic
Duration: 145.23ms
Samples: 1,452 (100μs interval)

TOP HOTSPOTS (by self time):
    1.  45.2ms (31.1%) - updateFrame @ EFTimegroup.ts:234
    2.  23.8ms (16.4%) - renderCanvas @ RenderContext.ts:456
    3.  18.9ms (13.0%) - processElements @ ElementProcessor.ts:789

BY FILE:
   82.1ms (56.5%) - EFTimegroup.ts
   34.5ms (23.8%) - RenderContext.ts
   12.3ms ( 8.5%) - ElementProcessor.ts

RECOMMENDATIONS:
  • updateFrame @ EFTimegroup.ts:234 takes 31.1% - consider optimization
  • renderCanvas called 234 times - consider caching or memoization
```

**Output Format (JSON):**
```json
{
  "sandbox": "EFCanvas",
  "scenario": "basic",
  "durationMs": 145.23,
  "samples": 1452,
  "sampleIntervalUs": 100,
  "hotspots": [
    {
      "rank": 1,
      "functionName": "updateFrame",
      "file": "EFTimegroup.ts",
      "line": 234,
      "column": 12,
      "selfTimeMs": 45.2,
      "totalTimeMs": 52.1,
      "selfTimePct": 31.1,
      "hitCount": 452
    }
  ],
  "byFile": [
    { "file": "EFTimegroup.ts", "timeMs": 82.1, "timePct": 56.5 }
  ],
  "recommendations": [
    "• updateFrame @ EFTimegroup.ts:234 takes 31.1% - consider optimization"
  ]
}
```

### Specialized Profiling Tools

**profile-playback.ts** - Profile playback/scrubbing performance
```bash
npx tsx scripts/profile-playback.ts --project improv-edit --duration 5000 --json
```

**profile-export.ts** - Profile video export performance
```bash
npx tsx scripts/profile-export.ts --project design-catalog --json
```

**profile-load.ts** - Profile page load performance
```bash
npx tsx scripts/profile-load.ts --project improv-edit --json
```

**profile-thumbnails.ts** - Profile thumbnail generation
**profile-scrub-frames.ts** - Profile frame scrubbing
**profile-resolution-scale.ts** - Profile resolution scaling impact

## Browser Integration

Profiling in the browser UI requires opening with `ef open`:

```bash
./scripts/ef open EFCanvas
```

This exposes profiling functions via Playwright:
- `window.__startProfiling(optionsJson)` - Start CDP profiler
- `window.__stopProfiling()` - Stop and return profile
- `window.__resetProfiling()` - Reset profiler state

The ScenarioViewer component automatically:
1. Detects controlled browser context
2. Shows "Enable Profiling" checkbox
3. Profiles scenario execution when enabled
4. Displays hotspots in ProfileViewer component
5. Allows downloading .cpuprofile files

## Profile Assertions (Performance Testing)

Add profile assertions to scenarios for regression testing:

```typescript
// Example (not yet fully integrated)
const profileAssertions: ProfileAssertion[] = [
  {
    type: "topHotspot",
    functionName: "optimizedFunction",
    position: 0, // Should be #1 hotspot
  },
  {
    type: "maxPercentage",
    functionName: "expensiveOperation",
    maxPercentage: 10, // Should not exceed 10% of time
  },
  {
    type: "notInTopN",
    fileName: "OldSlowCode.ts",
    maxN: 10, // Should not be in top 10
  },
];

const results = checkProfileAssertions(analysis.hotspots, profileAssertions);
```

## LLM Workflow

### 1. Initial Profile

```bash
# Get JSON output for LLM analysis
./scripts/ef profile EFCanvas basic --json > current-profile.json
```

### 2. LLM Analyzes Output

The LLM can parse the JSON to identify:
- Top hotspots by self time and percentage
- Files with aggregate high time
- Recommendations for optimization
- Specific file:line locations to investigate

### 3. Make Optimizations

LLM makes code changes based on analysis.

### 4. Validate with Comparison

```bash
# Save baseline
./scripts/ef profile EFCanvas basic --save .profiles/baseline.cpuprofile

# After changes, compare
./scripts/ef profile EFCanvas basic --baseline .profiles/baseline.cpuprofile --json
```

### 5. Iterate

Repeat until performance targets are met.

## Understanding Profile Output

### Self Time vs Total Time
- **Self time**: Time spent in the function itself (excluding callees)
- **Total time**: Time spent in function + all its callees
- **Self %**: Percentage of total profile time

### Filtering
By default, hotspots exclude:
- Internal V8 functions (e.g., `(garbage collector)`)
- node_modules code
- Bundler chunks (for cleaner output)

Use `showAll` toggle in UI or omit filters in CLI for full data.

### Source Map Resolution
The system automatically resolves bundled locations to original source:
- `chunk-ABC123.js:45` → `EFTimegroup.ts:234`
- Uses @jridgewell/trace-mapping for accurate resolution
- Falls back to simple parsing for Vite dev server

## Best Practices

### For LLMs

1. **Always use JSON output** for programmatic analysis
2. **Focus on top 5-10 hotspots** - biggest impact for effort
3. **Look for patterns** - same file appearing multiple times
4. **Check recommendations** - automated suggestions are often correct
5. **Validate changes** - always compare before/after profiles
6. **Watch for regressions** - use baseline comparison with thresholds

### For Humans

1. **Use browser UI** for exploration and visual inspection
2. **Download .cpuprofile** for Chrome DevTools flame graph
3. **Enable profiling judiciously** - adds overhead to scenario execution
4. **Focus on self time** - optimization there has direct impact
5. **Consider call count** - frequently called functions compound small costs

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│ Browser UI (ScenarioViewer)                             │
│  - Enable/disable profiling checkbox                    │
│  - ProfileViewer component                              │
│  - HotspotsList component                               │
└─────────────────┬───────────────────────────────────────┘
                  │
          Uses window.__startProfiling/stopProfiling
                  │
┌─────────────────▼───────────────────────────────────────┐
│ Playwright Integration (ef-open.ts)                     │
│  - Exposes CDP functions via page.exposeFunction()      │
│  - Queue management for concurrent requests             │
└─────────────────┬───────────────────────────────────────┘
                  │
              Uses CDP
                  │
┌─────────────────▼───────────────────────────────────────┐
│ Chrome DevTools Protocol (CDP)                          │
│  - Profiler.enable/start/stop                           │
│  - Returns CPUProfile object (V8 format)                │
└─────────────────┬───────────────────────────────────────┘
                  │
           Analyzed by
                  │
┌─────────────────▼───────────────────────────────────────┐
│ Unified Profiling Library (src/profiling/)              │
│  - analyzer: Calculate times, extract hotspots          │
│  - formatter: Text and JSON output                      │
│  - comparator: Diff and regression detection            │
│  - assertions: Performance testing                      │
└─────────────────┬───────────────────────────────────────┘
                  │
         Used by CLI tools
                  │
┌─────────────────▼───────────────────────────────────────┐
│ CLI Commands                                            │
│  - ef profile (main command)                            │
│  - profile-playback.ts (playback-specific)              │
│  - profile-export.ts (export-specific)                  │
│  - profile-load.ts (load-specific)                      │
│  - + other specialized tools                            │
└─────────────────────────────────────────────────────────┘
```

## File Locations

**Unified Library:**
- `packages/elements/src/profiling/` - Core profiling library

**CLI Tools:**
- `scripts/ef-profile.ts` - Main profiling command
- `scripts/ef-open.ts` - Browser integration with CDP
- `scripts/profile-*.ts` - Specialized profiling tools

**Browser UI:**
- `packages/elements/src/sandbox/scenario/ProfileViewer.tsx`
- `packages/elements/src/sandbox/scenario/HotspotsList.tsx`
- `packages/elements/src/sandbox/scenario/ScenarioViewer.tsx` (profiling integration)

**Utilities:**
- `scripts/ef-utils/profile.ts` - Legacy compatibility layer
- `packages/elements/src/sandbox/scenario/profile-utils.ts` - Deprecated, re-exports from unified library

## Troubleshooting

### "Profiling functions not available"

Ensure you opened with `ef open`, not a regular browser. The profiling functions are only exposed when Playwright controls the browser.

### "Profile data is empty"

The scenario may have executed too quickly. Try:
- Adding delays in the scenario
- Increasing sampling frequency (though overhead increases)
- Using longer-running scenarios

### Source maps not resolving

For Node.js scripts (not browser):
- Ensure `--enable-source-maps` flag is set
- Check that sourceMappingURL comments are present

For browser:
- Vite dev server includes source maps automatically
- Check browser DevTools Sources tab to verify maps loaded

## Advanced Usage

### Creating Custom Profile Analyses

```typescript
import {
  type CPUProfile,
  analyzeProfile,
  aggregateByFile,
  buildCallTree,
} from "@editframe/elements/profiling";

const profile: CPUProfile = /* ... */;
const analysis = analyzeProfile(profile);

// Custom aggregation
const hotFiles = Array.from(analysis.byFile.entries())
  .sort((a, b) => b[1] - a[1])
  .slice(0, 5);

console.log("Top 5 files by time:", hotFiles);

// Call tree analysis
const callTree = buildCallTree(profile);
console.log("Call tree depth:", getMaxDepth(callTree));
```

### Profile Assertions in Tests

```typescript
import { checkProfileAssertions } from "@editframe/elements/profiling";

// In your scenario
const assertions = [
  { type: "maxPercentage", functionName: "render", maxPercentage: 15 },
  { type: "notInTopN", fileName: "LegacyCode.ts", maxN: 10 },
];

const results = checkProfileAssertions(analysis.hotspots, assertions);
const allPassed = results.every(r => r.passed);

if (!allPassed) {
  console.error("Performance assertions failed:", results);
}
```

## LLM Optimization Workflow

### Step 1: Capture Baseline

```bash
# Create profiles directory
mkdir -p .profiles

# Capture baseline
./scripts/ef profile EFCanvas basic --save .profiles/baseline.cpuprofile
```

### Step 2: Get Analysis

```bash
# JSON output for LLM
./scripts/ef profile EFCanvas basic --json > analysis.json
```

### Step 3: LLM Reviews Analysis

Feed `analysis.json` to LLM with prompt:
```
Review this CPU profile and suggest optimizations.
Focus on the top 5 hotspots and provide specific code changes.
```

### Step 4: Validate Changes

```bash
# After LLM makes changes, compare
./scripts/ef profile EFCanvas basic \
  --baseline .profiles/baseline.cpuprofile \
  --json > comparison.json
```

### Step 5: Check for Regressions

```bash
# Fails with exit code 1 if regression detected
./scripts/ef profile EFCanvas basic \
  --baseline .profiles/baseline.cpuprofile

# Use in CI/CD
if [ $? -ne 0 ]; then
  echo "Performance regression detected!"
  exit 1
fi
```

## Integration with Existing Tools

### Browser UI Components (Legacy)

These components use the unified library via backward-compatible re-exports:
- `sandbox/scenario/profile-utils.ts` - Re-exports from `src/profiling/`
- `sandbox/scenario/ProfileViewer.tsx` - Uses HotspotsList component
- `sandbox/scenario/HotspotsList.tsx` - Renders hotspot table

### CLI Utilities (Legacy)

- `scripts/ef-utils/profile.ts` - Wraps unified library for CLI compatibility

## Migration Guide

If you have custom profiling code, migrate to the unified library:

**Before:**
```typescript
// Custom time calculation
const selfTime = new Map();
for (const node of profile.nodes) {
  // ... manual calculation
}
```

**After:**
```typescript
import { calculateSelfTime } from "@editframe/elements/profiling";

const selfTime = calculateSelfTime(profile);
```

## Future Enhancements

- [ ] Multi-run statistical analysis (median, variance)
- [ ] Continuous profiling with history tracking
- [ ] Integration with CI/CD for automatic regression gates
- [ ] Enhanced recommendation engine with pattern matching
- [ ] Call count tracking and loop detection
- [ ] Export to standard formats (Chrome Trace Event, Speedscope)

## See Also

- Chrome DevTools Protocol Documentation: https://chromedevtools.github.io/devtools-protocol/
- V8 CPU Profiler: https://v8.dev/docs/profile
- Source map specification: https://sourcemaps.info/spec.html
