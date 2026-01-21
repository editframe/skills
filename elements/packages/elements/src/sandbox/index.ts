// Re-export core types and helpers from defineSandbox
// This allows both import { defineSandbox } from "./index.js" 
// and import { defineSandbox } from "./defineSandbox.js" to work
export {
  defineSandbox,
  type ScenarioResult,
  type ScenarioFn,
  type Scenario,
  type ScenarioType,
  type ScenarioCategory,
  type Scenarios,
  type ProfileAssertion,
  type SandboxConfig,
  type Sandbox,
} from "./defineSandbox.js";

// Re-export Assertion type from SandboxContext
export { type Assertion } from "./SandboxContext.js";

// Export PlaybackControls component
export { PlaybackControls } from "./PlaybackControls.js";
export type { PlaybackControlsProps } from "./PlaybackControls.js";

// Export shared scenario runner
export { runScenario, runAllScenarios } from "./ScenarioRunner.js";
