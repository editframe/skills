---
alwaysApply: false
---
10 Cognitive Design Seeds (Beyond Code Constructs)

Enumerate the Core Concept, Then Code It

Name the one idea the system embodies — the invariant that stays true as everything else changes. Code should enumerate that concept directly, not simulate it through procedural scaffolding.

**Good**: Explicit type/enum + single determination function. **Bad**: Scattered boolean checks simulating the concept.

```typescript
type State = "idle" | "accumulating" | "ready";
function determineState(ctx: Context): State { /* ... */ }

// Bad: if (flag && value > threshold) { ... } scattered everywhere
```

**Why**: Explicit enumeration makes the mental model clear. The code structure directly reflects the concept.

Minimize Concept Count

Every abstraction adds a mental model. Collapse, merge, or generalize until the conceptual graph fits in one mind. If you can't whiteboard it from memory, it's too complex.

**Good**: Clear conceptual flow with single-responsibility steps. **Bad**: Mixed concerns with nested conditionals hiding the flow.

```typescript
function processMain(entity: Entity): void {
  const state = evaluateState(entity);
  const result = applyPolicies(state, entity);
  applyEffects(entity, transformData(state, result));
}
```

**Why**: Small conceptual graphs are understandable. Large ones resist comprehension.

One Direction of Truth

Each piece of knowledge lives in exactly one place — conceptually, not just physically. Avoid epistemic drift between code and intention.

**Good**: Each concept in one function/class. **Bad**: Duplicated logic or implicit scattered calculations.

```typescript
function shouldFinalize(state: State, duration: number): boolean {
  return state === "accumulating" && duration >= MIN_DURATION;
}
// Bad: Same logic in processVideo() and processAudio()
```

**Why**: Single source of truth prevents drift. When concepts change, update one place.

Encode Relationships, Not Just Structures

Systems are defined by relations as much as entities. Make relationships explicit in architecture, not implicit in control flow.

**Good**: Explicit function signatures showing relationships. **Bad**: Nested conditionals hiding connections.

```typescript
function shouldApply(state: State, entity: Entity): boolean {
  return state === "ready" && policy.allows(entity);
}
function coordinate(state: State, entity: Entity): void {
  if (shouldApply(state, entity)) performAction(entity);
}
```

**Why**: Explicit relationships reveal structure. You see how concepts connect, not infer from control flow.

Separate Semantics from Mechanism

Define what's true (semantics) apart from how it happens (mechanism). Separate evaluation from application.

**Good**: Pure evaluation functions separate from side-effect functions. **Bad**: Mixed evaluation and application.

```typescript
function evaluate(entity: Entity): Evaluation { /* pure */ }
function apply(entity: Entity, eval: Evaluation): void { /* side effects */ }

// Bad: function process() { evaluate(); apply(); } mixed together
```

**Why**: Test evaluation without side effects. Reason about truth independently of implementation.

Make the Invariants Obvious

Every system has truths that must always hold. Surface them explicitly in types, interfaces, or domain models.

**Good**: Invariants in types/interfaces. **Bad**: Hidden in comments or scattered conditionals.

```typescript
interface AccumulationState {
  type: "accumulating";
  startPts: number; // Invariant: always present when accumulating
  fragments: Fragment[]; // Invariant: non-empty when accumulating
}

// Bad: if (fragments.length > 0 && startPts !== null) { ... }
```

**Why**: Obvious invariants resist entropy. When adding code, you see what must remain true.

Shape Interfaces by Human Cognition

The real interface is the mental interface. Optimize for human conceptual flow, not API consistency alone.

**Good**: Function names reflect mental model. Main function orchestrates clear concept sequence. **Bad**: Technical names hiding conceptual flow.

```typescript
function generateIndex(stream: Stream): Index {
  const fragments = parseFragments(stream);
  const tracks = analyzeTracks(fragments);
  return buildIndex(tracks);
}
```

**Why**: Interfaces matching human thinking are easier to understand and extend. Code reads like a model of understanding.

Design for Evolution, Not Completion

Good abstractions survive change; great ones anticipate new concepts. Allow new ideas to be absorbed without violating old ones.

**Good**: Extension without modification. Feature detection in dedicated functions. **Bad**: Hard-coded checks throughout codebase.

```typescript
function supportsFeature(e: Entity): e is CapableEntity {
  return e.type === "special";
}
function process(e: Entity): void {
  if (supportsFeature(e)) useFeature(e.specialFeature);
}
```

**Why**: Abstractions anticipating evolution reduce change cost. New concepts add without breaking existing ones.

Type Safety as Invariant Enforcement

Use types to enforce invariants at compile time. Avoid `any` — it erases type safety and hides errors.

**Good**: Proper types throughout. **Bad**: `any` types erasing safety.

```typescript
interface Packet { pts: number; dts: number; isKeyframe: boolean; }
function process(packets: Packet[]): void { /* ... */ }

// Bad: function process(packets: any[]): void { ... }
```

**Why**: Types catch errors at compile time. `any` defers errors to runtime and loses IDE support.

Performance Through Caching, Not Recalculation

Cache repeated operations. Avoid redundant filtering, sorting, or expensive computations in loops.

**Good**: Cache filtered results, memoize expensive calculations. **Bad**: Repeated O(n log n) operations.

```typescript
const filteredPackets = packets.filter(p => p.streamIndex === id);
// Use filteredPackets, don't re-filter

// Bad: packets.filter(...).sort(...) called repeatedly in loops
```

**Why**: Performance matters. Caching prevents quadratic complexity from repeated linear operations.

Explicit Error Handling

Propagate errors explicitly. Validate inputs. Don't silently fail or hide failures.

**Good**: Explicit error types, validation, propagation. **Bad**: Silent failures, missing validation.

```typescript
function process(input: Input): Result<Output, Error> {
  if (!isValid(input)) return Err(new ValidationError());
  // ...
}

// Bad: if (error) return {}; // silent failure
```

**Why**: Explicit errors are debuggable. Silent failures hide bugs and make systems unreliable.
