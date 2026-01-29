import { assert, beforeEach, describe, test } from "vitest";
import "./EFTimegroup.js";
import type { EFTimegroup } from "./EFTimegroup.js";

beforeEach(() => {
  // Clean up DOM
  while (document.body.children.length) {
    document.body.children[0]?.remove();
  }
});

describe("Animation Fill-Mode Validation", () => {
  test("warns about delayed animation without backwards fill-mode", async () => {
    const warnings: string[] = [];
    const originalLog = console.log;
    const originalGroup = console.group;
    const originalGroupEnd = console.groupEnd;

    // Capture console output
    console.group = (message: string) => {
      warnings.push(message);
    };
    console.log = (message: string) => {
      warnings.push(message);
    };
    console.groupEnd = () => {};

    try {
      // Create timegroup with element that has delayed animation without backwards
      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      timegroup.setAttribute("mode", "fixed");
      timegroup.setAttribute("duration", "5s");
      document.body.appendChild(timegroup);

      const div = document.createElement("div");
      div.textContent = "Test";
      
      // Add CSS animation with delay but no fill-mode
      const style = document.createElement("style");
      style.textContent = `
        @keyframes test-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .test-animation {
          animation: test-fade-in 1s 500ms;
        }
      `;
      document.head.appendChild(style);
      
      div.classList.add("test-animation");
      timegroup.appendChild(div);

      await timegroup.updateComplete;
      
      // Seek to trigger animation synchronization
      timegroup.currentTimeMs = 100;
      await timegroup.updateComplete;

      // Wait a bit for animation discovery
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check if warning was logged
      const hasWarning = warnings.some(w => 
        typeof w === 'string' && w.includes('backwards')
      );
      
      assert.isTrue(
        hasWarning,
        "Should warn about missing backwards fill-mode on delayed animation"
      );

      // Cleanup
      document.head.removeChild(style);
    } finally {
      // Restore console
      console.log = originalLog;
      console.group = originalGroup;
      console.groupEnd = originalGroupEnd;
    }
  });

  test("warns about fade-in animation without backwards fill-mode", async () => {
    const warnings: string[] = [];
    const originalLog = console.log;
    const originalGroup = console.group;
    const originalGroupEnd = console.groupEnd;

    // Capture console output
    console.group = (message: string) => {
      warnings.push(message);
    };
    console.log = (message: string) => {
      warnings.push(message);
    };
    console.groupEnd = () => {};

    try {
      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      timegroup.setAttribute("mode", "fixed");
      timegroup.setAttribute("duration", "5s");
      document.body.appendChild(timegroup);

      const div = document.createElement("div");
      div.textContent = "Test";
      
      // Add CSS animation with fade-in but no fill-mode
      const style = document.createElement("style");
      style.textContent = `
        @keyframes test-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .fade-animation {
          animation: test-fade 1s;
        }
      `;
      document.head.appendChild(style);
      
      div.classList.add("fade-animation");
      timegroup.appendChild(div);

      await timegroup.updateComplete;
      
      timegroup.currentTimeMs = 100;
      await timegroup.updateComplete;

      await new Promise(resolve => setTimeout(resolve, 100));

      const hasWarning = warnings.some(w => 
        typeof w === 'string' && (w.includes('fade-in') || w.includes('backwards'))
      );
      
      assert.isTrue(
        hasWarning,
        "Should warn about fade-in animation without backwards fill-mode"
      );

      document.head.removeChild(style);
    } finally {
      console.log = originalLog;
      console.group = originalGroup;
      console.groupEnd = originalGroupEnd;
    }
  });

  test("does not warn when backwards fill-mode is present", async () => {
    const warnings: string[] = [];
    const originalLog = console.log;
    const originalGroup = console.group;
    const originalGroupEnd = console.groupEnd;

    console.group = (message: string) => {
      warnings.push(message);
    };
    console.log = (message: string) => {
      warnings.push(message);
    };
    console.groupEnd = () => {};

    try {
      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      timegroup.setAttribute("mode", "fixed");
      timegroup.setAttribute("duration", "5s");
      document.body.appendChild(timegroup);

      const div = document.createElement("div");
      div.textContent = "Test";
      
      // Add CSS animation WITH backwards fill-mode
      const style = document.createElement("style");
      style.textContent = `
        @keyframes test-correct {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .correct-animation {
          animation: test-correct 1s 500ms backwards;
        }
      `;
      document.head.appendChild(style);
      
      div.classList.add("correct-animation");
      timegroup.appendChild(div);

      await timegroup.updateComplete;
      
      timegroup.currentTimeMs = 100;
      await timegroup.updateComplete;

      await new Promise(resolve => setTimeout(resolve, 100));

      const hasWarning = warnings.some(w => 
        typeof w === 'string' && w.includes('Fill-Mode Warning')
      );
      
      assert.isFalse(
        hasWarning,
        "Should not warn when backwards fill-mode is correctly specified"
      );

      document.head.removeChild(style);
    } finally {
      console.log = originalLog;
      console.group = originalGroup;
      console.groupEnd = originalGroupEnd;
    }
  });
});
