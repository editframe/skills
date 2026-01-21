/**
 * Test script to validate Lit Task behavior regarding:
 * 1. How hostUpdate() calls run()
 * 2. When run() throws synchronously vs asynchronously
 * 3. How onError handles errors
 * 4. Whether aborted signals cause synchronous throws
 */

import { Task } from "@lit/task";
import { LitElement, html } from "lit";
import { customElement } from "lit/decorators.js";

// Track errors and calls
const logs: string[] = [];
const errors: Error[] = [];

function log(message: string) {
  logs.push(`[${Date.now()}] ${message}`);
  console.log(message);
}

function errorHandler(error: Error) {
  errors.push(error);
  log(`ERROR CAUGHT: ${error.name}: ${error.message}`);
}

// Create a test element
@customElement("test-element")
class TestElement extends LitElement {
  task = new Task(this, {
    autoRun: true,
    args: () => [this.getAttribute("value") || "default"] as const,
    task: async ([value], { signal }) => {
      log(`Task function started with value: ${value}`);
      log(`Signal aborted at start: ${signal?.aborted}`);
      
      // Check abort
      signal?.throwIfAborted();
      
      // Simulate async work
      await new Promise(resolve => setTimeout(resolve, 10));
      
      log(`Signal aborted after async: ${signal?.aborted}`);
      signal?.throwIfAborted();
      
      return `result: ${value}`;
    },
    onError: (error) => {
      log(`onError called: ${error.name}: ${error.message}`);
      errorHandler(error);
    },
    onComplete: (value) => {
      log(`onComplete called: ${value}`);
    },
  });

  render() {
    return html`<div>Test Element</div>`;
  }
}

async function testScenario(name: string, testFn: () => Promise<void>) {
  log(`\n=== Testing: ${name} ===`);
  logs.length = 0;
  errors.length = 0;
  
  try {
    await testFn();
  } catch (error) {
    log(`Test threw: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  log(`\nLogs for ${name}:`);
  logs.forEach(l => console.log(l));
  log(`\nErrors caught: ${errors.length}`);
  errors.forEach(e => console.log(`  - ${e.name}: ${e.message}`));
}

async function main() {
  // Register the element
  if (!customElements.get("test-element")) {
    customElements.define("test-element", TestElement);
  }

  // Test 1: Normal task execution
  await testScenario("Normal execution", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    
    const element = document.createElement("test-element") as TestElement;
    element.setAttribute("value", "test1");
    container.appendChild(element);
    
    await element.updateComplete;
    await new Promise(resolve => setTimeout(resolve, 50));
    
    container.remove();
  });

  // Test 2: Disconnect element while task is running
  await testScenario("Disconnect during task", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    
    const element = document.createElement("test-element") as TestElement;
    element.setAttribute("value", "test2");
    container.appendChild(element);
    
    await element.updateComplete;
    
    // Start task
    log(`Calling task.run()...`);
    try {
      const promise = element.task.run();
      log(`task.run() returned promise: ${promise}`);
      
      // Immediately disconnect
      log(`Disconnecting element...`);
      container.remove();
      log(`Element isConnected: ${element.isConnected}`);
      
      // Wait for task to complete/reject
      try {
        await promise;
        log(`Task promise resolved`);
      } catch (error) {
        log(`Task promise rejected: ${error instanceof Error ? error.message : String(error)}`);
      }
    } catch (error) {
      log(`task.run() threw synchronously: ${error instanceof Error ? error.message : String(error)}`);
      errorHandler(error as Error);
    }
    
    await new Promise(resolve => setTimeout(resolve, 50));
  });

  // Test 3: Call run() when signal is already aborted
  await testScenario("Run when signal already aborted", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    
    const element = document.createElement("test-element") as TestElement;
    element.setAttribute("value", "test3");
    container.appendChild(element);
    
    await element.updateComplete;
    
    // Disconnect to abort signal
    log(`Disconnecting element to abort signal...`);
    container.remove();
    log(`Element isConnected: ${element.isConnected}`);
    
    // Wait a bit for abort to propagate
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Now try to run the task
    log(`Calling task.run() after disconnect...`);
    try {
      const promise = element.task.run();
      log(`task.run() returned promise: ${promise}`);
      
      try {
        await promise;
        log(`Task promise resolved`);
      } catch (error) {
        log(`Task promise rejected: ${error instanceof Error ? error.message : String(error)}`);
      }
    } catch (error) {
      log(`task.run() threw synchronously: ${error instanceof Error ? error.message : String(error)}`);
      errorHandler(error as Error);
    }
    
    await new Promise(resolve => setTimeout(resolve, 50));
  });

  // Test 4: Simulate hostUpdate() calling run()
  await testScenario("Simulate hostUpdate calling run", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    
    const element = document.createElement("test-element") as TestElement;
    element.setAttribute("value", "test4");
    container.appendChild(element);
    
    await element.updateComplete;
    
    // Disconnect
    log(`Disconnecting element...`);
    container.remove();
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Simulate what hostUpdate() does - call _performTask which calls run()
    log(`Simulating hostUpdate() behavior...`);
    log(`Checking if we can access internal Task methods...`);
    
    // Try to access the task's internal state
    const task = element.task as any;
    log(`Task status: ${task.status}`);
    log(`Task value: ${task.value}`);
    log(`Task error: ${task.error}`);
    
    // Try calling run() directly (this is what hostUpdate does)
    log(`Calling task.run() directly...`);
    try {
      const promise = task.run();
      log(`task.run() returned promise: ${promise}`);
      
      try {
        await promise;
        log(`Task promise resolved`);
      } catch (error) {
        log(`Task promise rejected: ${error instanceof Error ? error.message : String(error)}`);
      }
    } catch (error) {
      log(`task.run() threw synchronously: ${error instanceof Error ? error.message : String(error)}`);
      errorHandler(error as Error);
    }
    
    await new Promise(resolve => setTimeout(resolve, 50));
  });

  // Test 5: Check if onError is called for synchronous throws
  await testScenario("onError for synchronous throws", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    
    let onErrorCalled = false;
    const element = document.createElement("test-element") as TestElement;
    
    // Create a custom task that throws synchronously
    const customTask = new Task(element, {
      autoRun: false,
      args: () => [] as const,
      task: async ([], { signal }) => {
        log(`Custom task started`);
        signal?.throwIfAborted(); // This will throw if aborted
        return "done";
      },
      onError: (error) => {
        onErrorCalled = true;
        log(`Custom task onError called: ${error.name}: ${error.message}`);
        errorHandler(error);
      },
    });
    
    element.setAttribute("value", "test5");
    container.appendChild(element);
    await element.updateComplete;
    
    // Disconnect
    container.remove();
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Try to run
    log(`Calling customTask.run() after disconnect...`);
    try {
      const promise = customTask.run();
      log(`customTask.run() returned promise: ${promise}`);
      
      try {
        await promise;
        log(`Custom task promise resolved`);
      } catch (error) {
        log(`Custom task promise rejected: ${error instanceof Error ? error.message : String(error)}`);
      }
    } catch (error) {
      log(`customTask.run() threw synchronously: ${error instanceof Error ? error.message : String(error)}`);
      log(`onErrorCalled: ${onErrorCalled}`);
      if (!onErrorCalled) {
        log(`⚠️ onError was NOT called for synchronous throw!`);
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 50));
  });

  log(`\n=== Summary ===`);
  log(`Total errors caught: ${errors.length}`);
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { main };
