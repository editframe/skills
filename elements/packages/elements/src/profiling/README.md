# Unified CPU Profiling Library

Core library for CPU profile analysis, formatting, and comparison. Optimized for LLM consumption with structured text and JSON output.

## Purpose

Consolidates profiling logic from:
- `sandbox/scenario/profile-utils.ts` (browser UI)
- `scripts/ef-utils/profile.ts` (CLI tools)
- Inline analysis in various `scripts/profile-*.ts` files

## Modules

### analyzer.ts
Core analysis functions for CPU profiles.

**Key exports:**
- `analyzeProfile()` - One-stop comprehensive analysis
- `getHotspots()` - Extract functions sorted by self time
- `calculateSelfTime()`, `calculateTotalTime()` - Time calculations
- `buildCallTree()` - Reconstruct call hierarchy
- `aggregateByFile()` - Sum time by file

### formatter.ts
Output formatting for human and machine consumption.

**Key exports:**
- `formatProfileAnalysis()` - Structured text output
- `formatProfileAnalysisJSON()` - Machine-readable JSON
- `formatProfileComparison()` - Diff output
- `generateRecommendations()` - Auto-suggest optimizations

### comparator.ts
Profile comparison and regression detection.

**Key exports:**
- `compareProfiles()` - Diff with configurable thresholds
- `hasRegression()` - Boolean regression check
- `getRegressionSummary()` - Extract regression details

### assertions.ts
Performance testing assertions.

**Key exports:**
- `checkProfileAssertions()` - Validate against expectations
- `formatAssertionResults()` - Format results for output

**Assertion types:**
- `topHotspot` - Function should be at specific rank
- `notInTopN` - Function should NOT be in top N
- `maxPercentage` - Function should not exceed % threshold
- `maxSelfTime` - Function should not exceed time threshold

### source-maps.ts
Source map resolution for bundled code.

**Key exports:**
- `resolveSourceLocation()` - Basic Vite dev server resolution
- `SourceMapResolver` - Full source map support

### types.ts
Shared TypeScript interfaces and types.

## Usage

```typescript
import { analyzeProfile, formatProfileAnalysis } from "@editframe/elements/profiling";

const profile: CPUProfile = /* from CDP */;

// Analyze
const analysis = analyzeProfile(profile, {
  filterNodeModules: true,
  filterInternals: true,
  topN: 20,
});

// Format for console
console.log(formatProfileAnalysis(analysis, {
  sandbox: "EFCanvas",
  scenario: "basic",
}));

// Or get JSON for LLM
const json = formatProfileAnalysisJSON(analysis, {
  sandbox: "EFCanvas",
  scenario: "basic",
});
```

## Design Principles

1. **LLM-first**: Structured, parseable output formats
2. **Composable**: Functions can be used independently or together
3. **Type-safe**: Full TypeScript types throughout
4. **Backward compatible**: Legacy code continues to work
5. **No side effects**: Pure functions where possible

## Migration

Old code using `profile-utils.ts` continues to work via re-exports:

```typescript
// Still works (backward compatible)
import { getHotspots } from "../sandbox/scenario/profile-utils.js";

// But prefer the unified library
import { analyzeProfile } from "@editframe/elements/profiling";
```

## Testing

*(Tests to be added)*

- Unit tests for time calculations
- Integration tests for analysis pipeline
- Snapshot tests for output formats
- Performance tests for large profiles

## See Also

- [PROFILING.md](../../PROFILING.md) - Complete profiling guide
- [scripts/ef-profile.ts](../../scripts/ef-profile.ts) - Main CLI command
- [sandbox/scenario/ProfileViewer.tsx](../sandbox/scenario/ProfileViewer.tsx) - Browser UI
