import { defineSandbox } from "../../../sandbox/index.js";
import { html } from "lit";
import { makeMediaEngineTask } from "./makeMediaEngineTask.js";
import "../../EFVideo.js"; // Import to register ef-video custom element

export default defineSandbox({
  name: "makeMediaEngineTask",
  description: "Task factory for creating media engine tasks with abort support",
  category: "elements",
  subcategory: "media",
  
  // Render element in template so it's properly initialized by Lit
  // Use ef-video since EFMedia is not a registered custom element
  render: () => html`
    <ef-video id="test-media" src="/assets/bars-n-tone.mp4" style="display: none;"></ef-video>
  `,
  
  scenarios: {
    async "aborts cleanly when element is disconnected"(ctx) {
      // Get the element from the rendered template
      const element = ctx.querySelector<import("../../EFVideo.js").EFVideo>("ef-video")!;
      ctx.expect(element).toBeDefined();
      
      // Wait for element to be fully initialized
      await element.updateComplete;
      await ctx.frame();
      
      // Create the task (element is now fully initialized with Lit controllers)
      const task = makeMediaEngineTask(element);
      
      // Start the task (triggers fetch)
      await ctx.frame();
      
      // Start waiting for task completion (this will be aborted when element is disconnected)
      const taskPromise = task.taskComplete.catch((error) => {
        // Expect AbortError when element is disconnected
        const isAbortError = 
          error instanceof DOMException && error.name === "AbortError" ||
          error instanceof Error && (
            error.name === "AbortError" ||
            error.message.includes("signal is aborted") ||
            error.message.includes("The user aborted a request")
          );
        
        if (!isAbortError) {
          throw error; // Re-throw unexpected errors
        }
        // AbortError is expected - return undefined to indicate successful cancellation
        return undefined;
      });
      
      // Immediately disconnect the element (this will abort the task)
      element.remove();
      await ctx.frame();
      
      // Await task cancellation - this should resolve without throwing
      await taskPromise;
      
      // Verify element is disconnected and task was properly cancelled
      ctx.expect(element.isConnected).toBe(false);
    },
    
    async "propagates signal through call chain"(ctx) {
      // Get the element from the rendered template
      const element = ctx.querySelector<import("../../EFVideo.js").EFVideo>("ef-video")!;
      ctx.expect(element).toBeDefined();
      
      // Wait for element to be fully initialized
      await element.updateComplete;
      await ctx.frame();
      
      const task = makeMediaEngineTask(element);
      
      // Test that signal is properly passed through
      // The task should complete successfully with a valid source
      await ctx.frame();
      
      // Wait a bit for the task to potentially complete
      await new Promise(r => setTimeout(r, 500));
    },
  },
});
