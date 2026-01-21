/**
 * Test script to validate Lit Task behavior regarding:
 * 1. How hostUpdate() calls run()
 * 2. When run() throws synchronously vs asynchronously
 * 3. How onError handles errors
 * 4. Whether aborted signals cause synchronous throws
 */

import { defineSandbox } from "./sandbox/index.js";
import { html } from "lit";
import { Task } from "@lit/task";
import { LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";

// Track logs and errors (shared across scenarios)
const logs: string[] = [];
const errors: Error[] = [];

function log(message: string) {
  const timestamp = performance.now().toFixed(2);
  logs.push(`[${timestamp}ms] ${message}`);
  console.log(`[TEST] ${message}`);
}

function errorHandler(error: Error) {
  errors.push(error);
  log(`ERROR CAUGHT: ${error.name}: ${error.message}`);
}

// Create a test element
@customElement("test-lit-task-element")
class TestLitTaskElement extends LitElement {
  @property({ type: String }) value = "default";

  task = new Task(this, {
    autoRun: true, // Like EFVideo's mediaEngineTask
    args: () => [this.value] as const,
    task: async ([value], { signal }) => {
      log(`Task function started with value: ${value}`);
      log(`Signal aborted at start: ${signal?.aborted}`);
      
      // CRITICAL: This is the exact line that throws in makeMediaEngineTask.ts:132
      // If the signal is already aborted when run() is called, this throws synchronously
      // The error is caught by run()'s try-catch, but might be logged before onError is called
      signal?.throwIfAborted();
      
      // Simulate async work (like fetching media engine)
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
    return html`<div>Test Element: ${this.value}</div>`;
  }
}

export default defineSandbox({
  name: "testLitTaskBehavior",
  description: "Test Lit Task behavior with aborted signals",
  category: "test",
  subcategory: "debugging",
  
  render: () => html`
    <ef-timegroup mode="fixed" duration="5s" style="width: 640px; height: 360px;">
      <test-lit-task-element id="test-el" value="initial"></test-lit-task-element>
    </ef-timegroup>
  `,
  
  scenarios: {
    async "Test 1: Normal execution"(ctx) {
      logs.length = 0;
      errors.length = 0;
      
      const element = ctx.querySelector<TestLitTaskElement>("test-lit-task-element")!;
      ctx.expect(element).toBeDefined();
      
      await element.updateComplete;
      await ctx.frame();
      await new Promise(resolve => setTimeout(resolve, 50));
      
      ctx.expect(errors.length).toBe(0);
      ctx.expect(logs.some(l => l.includes("onComplete"))).toBe(true);
    },
    
    async "Test 2: Disconnect during task"(ctx) {
      logs.length = 0;
      errors.length = 0;
      
      const element = ctx.querySelector<TestLitTaskElement>("test-lit-task-element")!;
      ctx.expect(element).toBeDefined();
      
      await element.updateComplete;
      await ctx.frame();
      
      // Start task
      log(`Calling task.run()...`);
      let runThrewSynchronously = false;
      let runReturnedPromise = false;
      
      try {
        const promise = element.task.run();
        runReturnedPromise = true;
        log(`task.run() returned promise`);
        
        // Immediately disconnect
        log(`Disconnecting element...`);
        element.remove();
        log(`Element isConnected: ${element.isConnected}`);
        
        // Wait for task to complete/reject
        try {
          await promise;
          log(`Task promise resolved`);
        } catch (error) {
          log(`Task promise rejected: ${error instanceof Error ? error.message : String(error)}`);
        }
      } catch (error) {
        runThrewSynchronously = true;
        log(`task.run() threw synchronously: ${error instanceof Error ? error.message : String(error)}`);
        errorHandler(error as Error);
      }
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Log results
      log(`runThrewSynchronously: ${runThrewSynchronously}`);
      log(`runReturnedPromise: ${runReturnedPromise}`);
      log(`errors.length: ${errors.length}`);
      log(`onError called: ${errors.length > 0 || logs.some(l => l.includes("onError"))}`);
    },
    
    async "Test 3: Run when signal already aborted"(ctx) {
      logs.length = 0;
      errors.length = 0;
      
      const element = ctx.querySelector<TestLitTaskElement>("test-lit-task-element")!;
      ctx.expect(element).toBeDefined();
      
      await element.updateComplete;
      await ctx.frame();
      
      // Disconnect to abort signal
      log(`Disconnecting element to abort signal...`);
      element.remove();
      log(`Element isConnected: ${element.isConnected}`);
      
      // Wait a bit for abort to propagate
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Now try to run the task
      log(`Calling task.run() after disconnect...`);
      let runThrewSynchronously = false;
      let runReturnedPromise = false;
      
      try {
        const promise = element.task.run();
        runReturnedPromise = true;
        log(`task.run() returned promise`);
        
        try {
          await promise;
          log(`Task promise resolved`);
        } catch (error) {
          log(`Task promise rejected: ${error instanceof Error ? error.message : String(error)}`);
        }
      } catch (error) {
        runThrewSynchronously = true;
        log(`task.run() threw synchronously: ${error instanceof Error ? error.message : String(error)}`);
        errorHandler(error as Error);
      }
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Log results
      log(`runThrewSynchronously: ${runThrewSynchronously}`);
      log(`runReturnedPromise: ${runReturnedPromise}`);
      log(`errors.length: ${errors.length}`);
      log(`onError called: ${errors.length > 0 || logs.some(l => l.includes("onError"))}`);
      
      // This is the key assertion - does run() throw synchronously when signal is aborted?
      ctx.expect(runThrewSynchronously || runReturnedPromise).toBe(true);
    },
    
    async "Test 4: hostUpdate behavior"(ctx) {
      logs.length = 0;
      errors.length = 0;
      
      const element = ctx.querySelector<TestLitTaskElement>("test-lit-task-element")!;
      ctx.expect(element).toBeDefined();
      
      await element.updateComplete;
      await ctx.frame();
      
      // Disconnect
      log(`Disconnecting element...`);
      element.remove();
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Trigger an update which will call hostUpdate() on controllers
      log(`Triggering update...`);
      element.value = "updated";
      element.requestUpdate();
      
      // Wait for update cycle
      await element.updateComplete;
      await ctx.frame();
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Check if errors were logged
      log(`errors.length after update: ${errors.length}`);
      log(`logs containing 'ERROR': ${logs.filter(l => l.includes("ERROR")).length}`);
    },
    
    async "Test 5: Reproduce EFVideo error - render nothing while task is running"(ctx) {
      logs.length = 0;
      errors.length = 0;
      
      const element = ctx.querySelector<TestLitTaskElement>("test-lit-task-element")!;
      ctx.expect(element).toBeDefined();
      
      await element.updateComplete;
      await ctx.frame();
      
      // Wait for task to start (autoRun: true means it runs on hostUpdate)
      log(`Waiting for task to start...`);
      await new Promise(resolve => setTimeout(resolve, 20));
      
      // Now simulate what ScenarioRunner does - render(nothing) to clear container
      // This disconnects the element and aborts tasks
      log(`Calling render(nothing) to clear container (simulates ScenarioRunner)...`);
      const container = ctx.getContainer();
      const { render, nothing } = await import("lit");
      
      // Set up error handlers BEFORE clearing to catch synchronous errors
      const originalConsoleError = console.error;
      const originalOnError = window.onerror;
      let consoleErrorCalled = false;
      let consoleErrorArgs: unknown[] = [];
      let windowErrorCalled = false;
      let windowErrorArgs: unknown[] = [];
      
      console.error = (...args: unknown[]) => {
        consoleErrorCalled = true;
        consoleErrorArgs = args;
        const errorMsg = args.map(a => {
          if (a instanceof Error) return `${a.name}: ${a.message}`;
          return String(a);
        }).join(", ");
        log(`console.error called: ${errorMsg}`);
        originalConsoleError.apply(console, args);
      };
      
      window.onerror = (message, source, lineno, colno, error) => {
        windowErrorCalled = true;
        windowErrorArgs = [message, source, lineno, colno, error];
        log(`window.onerror called: ${message}, error: ${error?.name}: ${error?.message}`);
        if (originalOnError) {
          return originalOnError(message, source, lineno, colno, error);
        }
        return false;
      };
      
      try {
        // This is what ScenarioRunner does - it clears the container
        // This disconnects the element, which should abort the task's signal
        render(nothing, container);
        log(`Element isConnected after render(nothing): ${element.isConnected}`);
        
        // CRITICAL: The error happens when Lit's update cycle processes the disconnected element
        // and calls hostUpdate() on the task. Let's simulate this by triggering an update
        // on the disconnected element
        log(`Triggering update on disconnected element (simulates Lit's update cycle)...`);
        
        // Access the task directly and simulate what hostUpdate() does
        const task = element.task as any;
        log(`Task status: ${task._status}`);
        log(`Task has abortController: ${!!task._abortController}`);
        if (task._abortController) {
          log(`AbortController signal aborted: ${task._abortController.signal.aborted}`);
        }
        
        // Try to trigger hostUpdate() manually (this is what Lit does)
        if (task.hostUpdate) {
          log(`Calling task.hostUpdate() directly...`);
          try {
            // hostUpdate() calls _performTask() which calls run()
            // If the signal is aborted, run() might throw synchronously
            await task.hostUpdate();
            log(`hostUpdate() completed without throwing`);
          } catch (error) {
            log(`hostUpdate() threw: ${error instanceof Error ? error.message : String(error)}`);
            errorHandler(error as Error);
          }
        }
        
        // Also try calling run() directly to see if it throws
        log(`Calling task.run() directly...`);
        try {
          const promise = task.run();
          log(`task.run() returned promise`);
          try {
            await promise;
            log(`task.run() promise resolved`);
          } catch (error) {
            log(`task.run() promise rejected: ${error instanceof Error ? error.message : String(error)}`);
          }
        } catch (error) {
          log(`task.run() threw synchronously: ${error instanceof Error ? error.message : String(error)}`);
          errorHandler(error as Error);
        }
        
        // Wait for any async operations
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (error) {
        log(`Error during test: ${error instanceof Error ? error.message : String(error)}`);
        errorHandler(error as Error);
      } finally {
        console.error = originalConsoleError;
        window.onerror = originalOnError;
      }
      
      // Check results
      log(`consoleErrorCalled: ${consoleErrorCalled}`);
      log(`windowErrorCalled: ${windowErrorCalled}`);
      log(`errors.length: ${errors.length}`);
      log(`logs containing 'ERROR': ${logs.filter(l => l.includes("ERROR")).length}`);
      
      if (consoleErrorCalled || windowErrorCalled) {
        log(`⚠️ Error was logged - this reproduces the EFVideo error`);
        const allErrorArgs = [...consoleErrorArgs, ...windowErrorArgs];
        const hasAbortError = allErrorArgs.some(arg => 
          (arg instanceof Error && (arg.name === "AbortError" || arg.message?.includes("signal is aborted"))) ||
          (typeof arg === "string" && (arg.includes("signal is aborted") || arg.includes("AbortError")))
        );
        if (hasAbortError) {
          log(`✅ Confirmed: AbortError was logged`);
        }
      }
    },
    
    async "Test 6: Exact EFVideo sequence - clear during performUpdate"(ctx) {
      logs.length = 0;
      errors.length = 0;
      
      // Create element with autoRun task (like EFVideo's mediaEngineTask)
      const element = ctx.querySelector<TestLitTaskElement>("test-lit-task-element")!;
      ctx.expect(element).toBeDefined();
      
      await element.updateComplete;
      await ctx.frame();
      
      // Wait for task to potentially start
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const container = ctx.getContainer();
      const { render, nothing } = await import("lit");
      
      // Set up error handlers BEFORE any operations
      const originalConsoleError = console.error;
      const originalOnError = window.onerror;
      let consoleErrorCalled = false;
      let consoleErrorArgs: unknown[] = [];
      let windowErrorCalled = false;
      
      console.error = (...args: unknown[]) => {
        consoleErrorCalled = true;
        consoleErrorArgs = args;
        const errorMsg = args.map(a => {
          if (a instanceof Error) return `${a.name}: ${a.message}`;
          return String(a);
        }).join(", ");
        log(`console.error: ${errorMsg}`);
        originalConsoleError.apply(console, args);
      };
      
      window.onerror = (message, source, lineno, colno, error) => {
        windowErrorCalled = true;
        log(`window.onerror: ${message}, error: ${error?.name}: ${error?.message}`);
        if (originalOnError) {
          return originalOnError(message, source, lineno, colno, error);
        }
        return false;
      };
      
      try {
        // CRITICAL: The error happens when render(nothing) is called
        // This disconnects the element, which should abort tasks
        // But Lit's update cycle might still be processing and call hostUpdate()
        log(`Calling render(nothing) to clear container...`);
        
        // Check task state before clearing
        const task = element.task as any;
        log(`Task status before clear: ${task._status}`);
        log(`Task has abortController before clear: ${!!task._abortController}`);
        if (task._abortController) {
          log(`AbortController signal aborted before clear: ${task._abortController.signal.aborted}`);
        }
        
        // Clear the container - this disconnects the element
        render(nothing, container);
        log(`Element isConnected after clear: ${element.isConnected}`);
        
        // Check task state after clearing
        log(`Task status after clear: ${task._status}`);
        log(`Task has abortController after clear: ${!!task._abortController}`);
        if (task._abortController) {
          log(`AbortController signal aborted after clear: ${task._abortController.signal.aborted}`);
        }
        
        // The error happens when Lit's update cycle processes the disconnected element
        // and calls hostUpdate() on controllers. Let's simulate this by manually
        // calling hostUpdate() on the disconnected element's task
        log(`Manually calling hostUpdate() on disconnected element's task...`);
        
        // Wait a tiny bit to ensure disconnect has propagated
        await new Promise(resolve => setTimeout(resolve, 1));
        
        // Now call hostUpdate() - this is what Lit does during performUpdate()
        if (task.hostUpdate) {
          try {
            // hostUpdate() calls _performTask() which calls run()
            // If the signal is aborted, this might throw
            await task.hostUpdate();
            log(`hostUpdate() completed`);
          } catch (error) {
            log(`hostUpdate() threw: ${error instanceof Error ? error.message : String(error)}`);
            errorHandler(error as Error);
          }
        }
        
        // Also try calling run() directly to see what happens
        log(`Calling run() directly...`);
        try {
          const promise = task.run();
          log(`run() returned promise`);
          await promise.catch(err => {
            log(`run() promise rejected: ${err instanceof Error ? err.message : String(err)}`);
          });
        } catch (error) {
          log(`run() threw synchronously: ${error instanceof Error ? error.message : String(error)}`);
          errorHandler(error as Error);
        }
        
        // Wait for any async operations
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (error) {
        log(`Error: ${error instanceof Error ? error.message : String(error)}`);
        errorHandler(error as Error);
      } finally {
        console.error = originalConsoleError;
        window.onerror = originalOnError;
      }
      
      log(`consoleErrorCalled: ${consoleErrorCalled}`);
      log(`windowErrorCalled: ${windowErrorCalled}`);
      if (consoleErrorCalled || windowErrorCalled) {
        log(`✅ Reproduced the error!`);
      }
    },
    
    async "Test 7: Task re-run while disconnected - key insight"(ctx) {
      // KEY INSIGHT: The error might happen when:
      // 1. Task is PENDING (running)
      // 2. Element is disconnected (signal aborted)
      // 3. Args change (triggers re-run)
      // 4. run() is called, but checks the OLD aborted signal before creating new one
      
      logs.length = 0;
      errors.length = 0;
      
      const element = ctx.querySelector<TestLitTaskElement>("test-lit-task-element")!;
      ctx.expect(element).toBeDefined();
      
      await element.updateComplete;
      await ctx.frame();
      
      // Start a task that will take time
      log(`Starting task...`);
      const task = element.task as any;
      const initialRunPromise = task.run();
      
      // Wait a tiny bit for task to start
      await new Promise(resolve => setTimeout(resolve, 5));
      
      log(`Task status: ${task._status}`);
      log(`Task has abortController: ${!!task._abortController}`);
      if (task._abortController) {
        log(`AbortController signal aborted: ${task._abortController.signal.aborted}`);
      }
      
      // Now disconnect the element (this should abort the signal)
      log(`Disconnecting element...`);
      element.remove();
      log(`Element connected: ${element.isConnected}`);
      
      // Wait for abort to propagate
      await new Promise(resolve => setTimeout(resolve, 5));
      
      log(`After disconnect - Task status: ${task._status}`);
      log(`After disconnect - AbortController signal aborted: ${task._abortController?.signal.aborted}`);
      
      // Now change args to trigger re-run while disconnected
      // This is what might happen if a property changes during disconnect
      log(`Changing value to trigger re-run...`);
      element.value = "changed";
      
      // Set up error handlers
      const originalConsoleError = console.error;
      let consoleErrorCalled = false;
      
      console.error = (...args: unknown[]) => {
        consoleErrorCalled = true;
        const errorMsg = args.map(a => {
          if (a instanceof Error) return `${a.name}: ${a.message}`;
          return String(a);
        }).join(", ");
        log(`console.error: ${errorMsg}`);
        originalConsoleError.apply(console, args);
      };
      
      try {
        // Trigger update which will call hostUpdate() -> _performTask() -> run()
        // But the element is disconnected, so the signal might be aborted
        log(`Triggering update (will call hostUpdate)...`);
        element.requestUpdate();
        
        // Wait for update cycle
        await element.updateComplete;
        await ctx.frame();
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (error) {
        log(`Error: ${error instanceof Error ? error.message : String(error)}`);
        errorHandler(error as Error);
      } finally {
        console.error = originalConsoleError;
      }
      
      log(`consoleErrorCalled: ${consoleErrorCalled}`);
      if (consoleErrorCalled) {
        log(`✅ Reproduced the error!`);
      }
    },
    
    async "Test 8: Reproduce - signal aborted when task function starts"(ctx) {
      // KEY INSIGHT: The error happens when:
      // 1. Element is disconnected (signal aborted)
      // 2. hostUpdate() is called (from Lit's update cycle)
      // 3. hostUpdate() -> _performTask() -> run()
      // 4. run() creates NEW AbortController and calls task function
      // 5. BUT - if the element was disconnected, maybe Lit Task aborts the signal?
      //    OR - maybe the OLD signal is checked before the new one is created?
      
      logs.length = 0;
      errors.length = 0;
      
      const element = ctx.querySelector<TestLitTaskElement>("test-lit-task-element")!;
      ctx.expect(element).toBeDefined();
      
      await element.updateComplete;
      await ctx.frame();
      
      // Start a task
      log(`Starting initial task...`);
      const task = element.task as any;
      const initialPromise = task.run();
      
      // Wait for task to be PENDING
      await new Promise(resolve => setTimeout(resolve, 5));
      log(`Task status: ${task._status} (1=PENDING, 2=COMPLETE)`);
      
      // Now disconnect - this should abort the signal
      log(`Disconnecting element...`);
      element.remove();
      log(`Element connected: ${element.isConnected}`);
      
      // Wait for abort to propagate
      await new Promise(resolve => setTimeout(resolve, 5));
      
      // Check if the abortController was aborted
      log(`AbortController signal aborted: ${task._abortController?.signal.aborted}`);
      
      // Now trigger hostUpdate() - this is what Lit does during performUpdate()
      // This will call _performTask() -> run()
      // If run() checks the OLD signal before creating a new one, it might throw
      log(`Calling hostUpdate() on disconnected element...`);
      
      // Set up error handlers BEFORE calling hostUpdate
      const originalConsoleError = console.error;
      let consoleErrorCalled = false;
      let consoleErrorArgs: unknown[] = [];
      
      console.error = (...args: unknown[]) => {
        consoleErrorCalled = true;
        consoleErrorArgs = args;
        const errorMsg = args.map(a => {
          if (a instanceof Error) return `${a.name}: ${a.message}`;
          return String(a);
        }).join(", ");
        log(`console.error: ${errorMsg}`);
        originalConsoleError.apply(console, args);
      };
      
      try {
        // Call hostUpdate() - this simulates what Lit does
        if (task.hostUpdate) {
          // hostUpdate() calls _performTask() which calls run()
          // run() should create a new AbortController, but maybe it checks the old one first?
          await task.hostUpdate();
          log(`hostUpdate() completed`);
        }
      } catch (error) {
        log(`hostUpdate() threw: ${error instanceof Error ? error.message : String(error)}`);
        errorHandler(error as Error);
      } finally {
        console.error = originalConsoleError;
      }
      
      // Wait for any async operations
      await new Promise(resolve => setTimeout(resolve, 50));
      
      log(`consoleErrorCalled: ${consoleErrorCalled}`);
      if (consoleErrorCalled) {
        const hasAbortError = consoleErrorArgs.some(arg => 
          (arg instanceof Error && (arg.name === "AbortError" || arg.message?.includes("signal is aborted"))) ||
          (typeof arg === "string" && arg.includes("signal is aborted"))
        );
        if (hasAbortError) {
          log(`✅ Reproduced the AbortError!`);
        }
      }
    },
    
    async "Test 9: Exact EFVideo scenario sequence - clear between scenarios"(ctx) {
      // This test simulates the EXACT sequence:
      // 1. First scenario completes ("renders video element")
      // 2. runScenario() is called for next scenario
      // 3. runScenario() clears container with render(nothing)
      // 4. This disconnects elements
      // 5. But Lit's update cycle from previous scenario might still be running
      // 6. performUpdate() calls hostUpdate() on disconnected element's controllers
      // 7. hostUpdate() -> _performTask() -> run()
      // 8. run() calls task function
      // 9. task function calls signal?.throwIfAborted() - THIS THROWS if signal is aborted
      
      logs.length = 0;
      errors.length = 0;
      
      const element = ctx.querySelector<TestLitTaskElement>("test-lit-task-element")!;
      ctx.expect(element).toBeDefined();
      
      await element.updateComplete;
      await ctx.frame();
      
      // Start a task that will take time (keep it PENDING)
      log(`Starting long-running task...`);
      const task = element.task as any;
      const taskPromise = task.run();
      
      // Wait a bit for task to be PENDING
      await new Promise(resolve => setTimeout(resolve, 5));
      log(`Task status: ${task._status} (1=PENDING, 2=COMPLETE)`);
      
      const container = ctx.getContainer();
      const { render, nothing } = await import("lit");
      
      // Set up comprehensive error tracking BEFORE clearing
      const originalConsoleError = console.error;
      const originalOnError = window.onerror;
      let consoleErrorCalled = false;
      let consoleErrorArgs: unknown[] = [];
      let windowErrorCalled = false;
      
      console.error = (...args: unknown[]) => {
        consoleErrorCalled = true;
        consoleErrorArgs = args;
        const errorMsg = args.map(a => {
          if (a instanceof Error) return `${a.name}: ${a.message}`;
          return String(a);
        }).join(", ");
        log(`console.error: ${errorMsg}`);
        originalConsoleError.apply(console, args);
      };
      
      window.onerror = (message, source, lineno, colno, error) => {
        windowErrorCalled = true;
        log(`window.onerror: ${message}, error: ${error?.name}: ${error?.message}`);
        if (originalOnError) {
          return originalOnError(message, source, lineno, colno, error);
        }
        return false;
      };
      
      try {
        // This is what runScenario() does - clear container
        log(`=== Clearing container (simulating runScenario for next scenario) ===`);
        log(`Before clear - Element connected: ${element.isConnected}`);
        
        const task = element.task as any;
        log(`Before clear - Task status: ${task._status}`);
        log(`Before clear - Task has abortController: ${!!task._abortController}`);
        if (task._abortController) {
          log(`Before clear - AbortController signal aborted: ${task._abortController.signal.aborted}`);
        }
        
        // Clear container - this disconnects the element
        render(nothing, container);
        
        log(`After clear - Element connected: ${element.isConnected}`);
        log(`After clear - Task status: ${task._status}`);
        log(`After clear - Task has abortController: ${!!task._abortController}`);
        if (task._abortController) {
          log(`After clear - AbortController signal aborted: ${task._abortController.signal.aborted}`);
        }
        
        // CRITICAL: The error happens when Lit's update cycle processes the disconnected element
        // This happens AFTER render(nothing) but BEFORE the next render()
        // Lit might still be processing updates from the previous scenario
        
        // Simulate what happens: Lit calls performUpdate() which calls hostUpdate() on controllers
        // Use microtask to simulate Lit's timing
        await new Promise<void>(resolve => {
          queueMicrotask(() => {
            log(`In microtask - simulating Lit's update cycle...`);
            
            // Simulate performUpdate() calling hostUpdate() on controllers
            if (task.hostUpdate) {
              log(`Calling task.hostUpdate() in microtask...`);
              try {
                // hostUpdate() is NOT async, but _performTask() is
                // If _performTask() throws synchronously, we'll catch it
                const result = task.hostUpdate();
                log(`hostUpdate() returned: ${result}`);
                
                // If it returned a promise, await it
                if (result && typeof result.then === "function") {
                  result.catch((err: unknown) => {
                    log(`hostUpdate() promise rejected: ${err instanceof Error ? err.message : String(err)}`);
                  });
                }
              } catch (error) {
                log(`hostUpdate() threw synchronously: ${error instanceof Error ? error.message : String(error)}`);
                catchError("hostUpdate-sync", error);
              }
            }
            
            resolve();
          });
        });
        
        // Also try in next animation frame
        await new Promise<void>(resolve => {
          requestAnimationFrame(() => {
            log(`In RAF - simulating Lit's update cycle...`);
            
            if (task.hostUpdate) {
              log(`Calling task.hostUpdate() in RAF...`);
              try {
                const result = task.hostUpdate();
                if (result && typeof result.then === "function") {
                  result.catch((err: unknown) => {
                    log(`hostUpdate() promise rejected in RAF: ${err instanceof Error ? err.message : String(err)}`);
                  });
                }
              } catch (error) {
                log(`hostUpdate() threw synchronously in RAF: ${error instanceof Error ? error.message : String(error)}`);
                catchError("hostUpdate-raf-sync", error);
              }
            }
            
            resolve();
          });
        });
        
        // Now render new content (simulating next scenario)
        log(`Rendering new content (simulating next scenario)...`);
        render(html`<test-lit-task-element value="new"></test-lit-task-element>`, container);
        
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        log(`Test error: ${error instanceof Error ? error.message : String(error)}`);
        catchError("test-catch", error);
      } finally {
        console.error = originalConsoleError;
        window.onerror = originalOnError;
      }
      
      // Report results
      log(`=== Results ===`);
      log(`consoleErrorCalled: ${consoleErrorCalled}`);
      log(`windowErrorCalled: ${windowErrorCalled}`);
      if (consoleErrorCalled) {
        const hasAbortError = consoleErrorArgs.some(arg => 
          (arg instanceof Error && (arg.name === "AbortError" || arg.message?.includes("signal is aborted"))) ||
          (typeof arg === "string" && arg.includes("signal is aborted"))
        );
        if (hasAbortError) {
          log(`✅ Reproduced the AbortError!`);
        }
      }
    },
    
    async "Test 10: Simulate exact EFVideo scenario sequence"(ctx) {
      logs.length = 0;
      errors.length = 0;
      
      // This test simulates the EXACT sequence from EFVideo sandbox:
      // 1. First scenario renders element
      // 2. Scenario completes
      // 3. ScenarioRunner clears container with render(nothing)
      // 4. Next scenario starts, but Lit's update cycle from previous scenario
      //    might still be running and call hostUpdate() on disconnected element
      
      const element = ctx.querySelector<TestLitTaskElement>("test-lit-task-element")!;
      ctx.expect(element).toBeDefined();
      
      await element.updateComplete;
      await ctx.frame();
      
      // Wait for task to start (autoRun: true)
      await new Promise(resolve => setTimeout(resolve, 20));
      
      const container = ctx.getContainer();
      const { render, nothing } = await import("lit");
      
      // Set up comprehensive error tracking
      const originalConsoleError = console.error;
      const originalOnError = window.onerror;
      const originalUnhandledRejection = window.onunhandledrejection;
      
      let errorsCaught: Array<{source: string, error: unknown}> = [];
      
      const catchError = (source: string, error: unknown) => {
        errorsCaught.push({source, error});
        log(`${source} caught: ${error instanceof Error ? error.name + ": " + error.message : String(error)}`);
      };
      
      console.error = (...args: unknown[]) => {
        catchError("console.error", args[0]);
        originalConsoleError.apply(console, args);
      };
      
      window.onerror = (message, source, lineno, colno, error) => {
        catchError("window.onerror", error || message);
        if (originalOnError) {
          return originalOnError(message, source, lineno, colno, error);
        }
        return false;
      };
      
      window.onunhandledrejection = (event) => {
        catchError("window.onunhandledrejection", event.reason);
        if (originalUnhandledRejection) {
          originalUnhandledRejection(event);
        }
      };
      
      try {
        // Simulate ScenarioRunner clearing container between scenarios
        log(`=== Simulating ScenarioRunner.clearContainer() ===`);
        
        // Before clearing, check task state
        const task = element.task as any;
        log(`Before clear - Task status: ${task._status}`);
        log(`Before clear - Element connected: ${element.isConnected}`);
        
        // Clear container (this is what ScenarioRunner does)
        log(`Calling render(nothing, container)...`);
        render(nothing, container);
        
        log(`After clear - Element connected: ${element.isConnected}`);
        log(`After clear - Task status: ${task._status}`);
        
        // The error happens here - Lit's update cycle might still be processing
        // and call hostUpdate() on controllers of disconnected elements
        // Let's simulate this by triggering an update cycle
        
        // Use microtask to simulate Lit's update cycle timing
        await new Promise<void>(resolve => {
          queueMicrotask(() => {
            log(`In microtask - simulating Lit's update cycle...`);
            
            // Simulate what Lit does: call hostUpdate() on all controllers
            // This happens during performUpdate()
            if (task.hostUpdate) {
              log(`Calling task.hostUpdate() in microtask...`);
              try {
                // This should be awaited, but if it throws synchronously, we'll catch it
                const hostUpdatePromise = task.hostUpdate();
                hostUpdatePromise.catch(err => {
                  log(`hostUpdate() promise rejected: ${err instanceof Error ? err.message : String(err)}`);
                });
              } catch (error) {
                log(`hostUpdate() threw synchronously: ${error instanceof Error ? error.message : String(error)}`);
                catchError("hostUpdate-sync", error);
              }
            }
            
            resolve();
          });
        });
        
        // Also try in next animation frame (Lit uses RAF for updates)
        await new Promise<void>(resolve => {
          requestAnimationFrame(() => {
            log(`In requestAnimationFrame - simulating Lit's update cycle...`);
            
            if (task.hostUpdate) {
              log(`Calling task.hostUpdate() in RAF...`);
              try {
                const hostUpdatePromise = task.hostUpdate();
                hostUpdatePromise.catch(err => {
                  log(`hostUpdate() promise rejected in RAF: ${err instanceof Error ? err.message : String(err)}`);
                });
              } catch (error) {
                log(`hostUpdate() threw synchronously in RAF: ${error instanceof Error ? error.message : String(error)}`);
                catchError("hostUpdate-raf-sync", error);
              }
            }
            
            resolve();
          });
        });
        
        // Wait for everything to settle
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        log(`Test error: ${error instanceof Error ? error.message : String(error)}`);
        catchError("test-catch", error);
      } finally {
        console.error = originalConsoleError;
        window.onerror = originalOnError;
        window.onunhandledrejection = originalUnhandledRejection;
      }
      
      // Report results
      log(`=== Results ===`);
      log(`Total errors caught: ${errorsCaught.length}`);
      errorsCaught.forEach(({source, error}) => {
        const isAbortError = 
          (error instanceof Error && (error.name === "AbortError" || error.message?.includes("signal is aborted"))) ||
          (typeof error === "string" && error.includes("signal is aborted"));
        log(`  ${source}: ${isAbortError ? "✅ AbortError" : "❌ Other error"}`);
      });
      
      if (errorsCaught.length > 0) {
        log(`✅ Reproduced the error!`);
      }
    },
  },
});
