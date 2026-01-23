/**
 * Test to reproduce the EFVideo AbortError by focusing on re-entrant task runs.
 * 
 * Hypothesis: The error occurs when:
 * 1. run() is called
 * 2. run() calls this._host.requestUpdate() BEFORE creating new AbortController
 * 3. requestUpdate() triggers a synchronous update that re-enters run()
 * 4. The re-entrant run() aborts the OLD controller (which may already be aborted or stale)
 * 5. When the original run() continues, it creates an AbortController but the state is corrupted
 */

import { defineSandbox } from "./sandbox/index.js";
import { html } from "lit";
import { Task } from "@lit/task";
import { LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";

const logs: string[] = [];

function log(msg: string) {
  const ts = performance.now().toFixed(2);
  logs.push(`[${ts}] ${msg}`);
  console.log(`[REENTRANT-TEST] ${msg}`);
}

// Element that triggers property changes during update (like ef-timegroup does)
@customElement("parent-trigger-element")
class ParentTriggerElement extends LitElement {
  @property({ type: Number }) childValue = 0;
  
  private updateCount = 0;
  
  protected updated() {
    this.updateCount++;
    log(`ParentTriggerElement updated (count: ${this.updateCount})`);
    
    // Like ef-timegroup, schedule another update after completion
    // This is what causes "Element scheduled an update after an update completed"
    if (this.updateCount === 1) {
      log(`ParentTriggerElement scheduling child update...`);
      // Change child's args to trigger task re-run
      this.childValue = 1;
    }
  }
  
  render() {
    return html`<slot></slot>`;
  }
}

// Element with a task that can be re-run
@customElement("reentrant-task-element")
class ReentrantTaskElement extends LitElement {
  @property({ type: Number }) value = 0;

  private taskRunCount = 0;
  
  task = new Task(this, {
    autoRun: true,
    args: () => {
      log(`task.args() called, value=${this.value}`);
      return [this.value] as const;
    },
    task: async ([val], { signal }) => {
      this.taskRunCount++;
      const runNum = this.taskRunCount;
      log(`Task #${runNum} started, value=${val}, signal.aborted=${signal?.aborted}`);
      
      // This is the line that throws in makeMediaEngineTask
      try {
        signal?.throwIfAborted();
        log(`Task #${runNum} passed throwIfAborted check`);
      } catch (e) {
        log(`Task #${runNum} throwIfAborted THREW: ${e}`);
        throw e;
      }
      
      // Simulate async work
      await new Promise(r => setTimeout(r, 50));
      
      log(`Task #${runNum} completed`);
      return `result-${val}`;
    },
    onError: (error) => {
      if (error instanceof Error) {
        log(`task.onError: ${error.name}: ${error.message}`);
      } else {
        log(`task.onError: ${String(error)}`);
      }
    },
    onComplete: (value) => {
      log(`task.onComplete: ${value}`);
    },
  });

  render() {
    return html`<div>Value: ${this.value}</div>`;
  }
}

export default defineSandbox({
  name: "testReentrantTask",
  description: "Test re-entrant task runs that might cause AbortError",
  category: "test",
  subcategory: "debugging",
  
  render: () => html`
    <parent-trigger-element>
      <reentrant-task-element id="test-el" .value=${0}></reentrant-task-element>
    </parent-trigger-element>
  `,
  
  scenarios: {
    async "Scenario 1: Parent triggers child update during its update"(ctx) {
      logs.length = 0;
      
      const parent = ctx.querySelector<ParentTriggerElement>("parent-trigger-element")!;
      const child = ctx.querySelector<ReentrantTaskElement>("reentrant-task-element")!;
      
      ctx.expect(parent).toBeDefined();
      ctx.expect(child).toBeDefined();
      
      log("Initial state - waiting for updates to settle");
      await parent.updateComplete;
      await child.updateComplete;
      await ctx.frame();
      
      // Wait for any initial task to complete
      await new Promise(r => setTimeout(r, 100));
      
      log("=== Logs from scenario ===");
      logs.forEach(l => console.log(l));
    },
    
    async "Scenario 2: Rapid property changes"(ctx) {
      logs.length = 0;
      
      const child = ctx.querySelector<ReentrantTaskElement>("reentrant-task-element")!;
      ctx.expect(child).toBeDefined();
      
      await child.updateComplete;
      await ctx.frame();
      
      log("Rapidly changing value to trigger multiple run() calls");
      
      // Rapidly change the value multiple times
      child.value = 1;
      child.value = 2;
      child.value = 3;
      
      await child.updateComplete;
      await ctx.frame();
      await new Promise(r => setTimeout(r, 200));
      
      log("=== Logs from scenario ===");
      logs.forEach(l => console.log(l));
    },
    
    async "Scenario 3: Change value during task execution"(ctx) {
      logs.length = 0;
      
      const child = ctx.querySelector<ReentrantTaskElement>("reentrant-task-element")!;
      ctx.expect(child).toBeDefined();
      
      await child.updateComplete;
      await ctx.frame();
      
      log("Starting task and immediately changing value");
      
      // Start a task
      const task = child.task as any;
      task.run();
      
      // Immediately change value (triggers another run during the first)
      child.value = 99;
      
      await child.updateComplete;
      await ctx.frame();
      await new Promise(r => setTimeout(r, 200));
      
      log("=== Logs from scenario ===");
      logs.forEach(l => console.log(l));
    },
  },
});
