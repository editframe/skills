---
alwaysApply: false
---
# Component Test Quality Principles

## Verify Observable Behavior, Not Implementation Details

Tests should check **what the component produces** (rendered DOM, visible outputs, user-observable state) rather than **how it produces it** (which functions were called, internal implementation details).

**Good**: Assert that a style element exists in `document.head` with expected CSS content.
**Bad**: Assert that a specific hook or utility function was called with specific parameters.

**Why**: Tests that verify observable behavior survive refactoring. Tests that check implementation details break when you improve the code structure.

## Test Names Describe Behavior, Not Steps

Test names should explain **what behavior is being verified**, not enumerate steps or implementation details.

**Good**: `"keyframeStyles are included in fullCSS"`
**Bad**: `"1.1 test that utility function is called and result is passed to another function"`

**Why**: Descriptive names make tests self-documenting and help identify what broke when tests fail.

## Verify Invariants Explicitly

Tests should make explicit assertions about **what must always be true** (invariants) rather than checking intermediate steps.

**Good**: Assert that the rendered element has the correct `data-element-id` attribute and contains expected children.
**Bad**: Assert that an internal helper function returned a specific component type.

**Why**: Invariants are the contract your component must maintain. Verifying them directly makes tests resilient to internal changes.

## Check Outputs and Values, Not Mechanisms

Tests should verify the **final outputs** (rendered HTML, DOM structure, computed values) rather than the **mechanisms** that produce them (function calls, hook invocations, internal state).

**Good**: Check that `styleElement.textContent` contains expected CSS.
**Bad**: Check that a mocked utility function was called exactly once.

**Why**: Outputs are what users and other components interact with. Mechanisms can change during refactoring without changing behavior.

## Encapsulate Implementation Details

Use mocks to control **inputs** (dependencies, props, state) but verify **outputs** (rendered DOM, observable side effects). Don't mock what you're testing.

**Good**: Mock a hook to return specific styles, then verify those styles appear in the rendered element's `style` attribute.
**Bad**: Mock a hook and assert it was called, without checking if the styles were actually applied.

**Why**: Encapsulation allows refactoring internals while maintaining the same external contract. Tests should verify the contract, not the internals.
