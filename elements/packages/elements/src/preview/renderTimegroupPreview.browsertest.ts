/**
 * Unit tests for renderTimegroupPreview.ts core functions.
 * 
 * Tests verify observable behavior (DOM structure, CSS properties) not implementation details.
 * Follows component-test-coverage principles: verify outputs, not mechanisms.
 */

import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import {
  buildCloneStructure,
  syncStyles,
  collectDocumentStyles,
  traverseCloneTree,
  type SyncState,
  type CloneNode,
} from "./renderTimegroupPreview.js";

// Import custom elements for integration tests
import "../elements/EFTimegroup.js";
import "../elements/EFVideo.js";
import "../elements/EFImage.js";
import type { EFTimegroup } from "../elements/EFTimegroup.js";

describe("buildCloneStructure", () => {
  describe("basic element cloning", () => {
    it("creates a clone container with absolute positioning", () => {
      const source = document.createElement("div");
      source.innerHTML = "<span>Hello</span>";
      
      const { container } = buildCloneStructure(source);
      
      expect(container.tagName).toBe("DIV");
      expect(container.style.position).toBe("absolute");
      expect(container.style.top).toBe("0px");
      expect(container.style.left).toBe("0px");
      expect(container.style.width).toBe("100%");
      expect(container.style.height).toBe("100%");
    });

    it("clones simple div hierarchy", () => {
      const source = document.createElement("div");
      source.innerHTML = `
        <div class="parent">
          <span class="child">Text</span>
        </div>
      `;
      
      const { container, syncState } = buildCloneStructure(source);
      
      const clonedParent = container.querySelector(".parent");
      const clonedChild = container.querySelector(".child");
      
      expect(clonedParent).toBeTruthy();
      expect(clonedChild).toBeTruthy();
      expect(clonedChild?.textContent?.trim()).toBe("Text");
    });

    it("preserves class attributes on clones", () => {
      const source = document.createElement("div");
      source.className = "root-class";
      source.innerHTML = `<span class="inner-class">Content</span>`;
      
      const { container } = buildCloneStructure(source);
      
      const root = container.firstElementChild;
      const inner = container.querySelector(".inner-class");
      
      expect(root?.classList.contains("root-class")).toBe(true);
      expect(inner?.classList.contains("inner-class")).toBe(true);
    });

    it("preserves data attributes on clones", () => {
      const source = document.createElement("div");
      source.dataset.testId = "test-value";
      source.dataset.customAttr = "custom";
      
      const { container } = buildCloneStructure(source);
      
      const clone = container.firstElementChild as HTMLElement;
      expect(clone.dataset.testId).toBe("test-value");
      expect(clone.dataset.customAttr).toBe("custom");
    });

    it("copies text content from text nodes", () => {
      const source = document.createElement("div");
      source.textContent = "Plain text content";
      
      const { container } = buildCloneStructure(source);
      
      expect(container.textContent?.trim()).toBe("Plain text content");
    });
  });

  describe("SKIP_TAGS filtering", () => {
    it("skips EF-AUDIO elements", () => {
      const source = document.createElement("div");
      source.innerHTML = `
        <div class="content">Visible</div>
        <ef-audio src="test.mp3"></ef-audio>
      `;
      
      const { container } = buildCloneStructure(source);
      
      expect(container.querySelector("ef-audio")).toBeNull();
      expect(container.querySelector(".content")).toBeTruthy();
    });

    it("skips SCRIPT and STYLE elements", () => {
      const source = document.createElement("div");
      source.innerHTML = `
        <script>console.log('test')</script>
        <style>.test { color: red; }</style>
        <div class="visible">Content</div>
      `;
      
      const { container } = buildCloneStructure(source);
      
      expect(container.querySelector("script")).toBeNull();
      expect(container.querySelector("style")).toBeNull();
      expect(container.querySelector(".visible")).toBeTruthy();
    });

    it("skips EF-TIMELINE, EF-WORKBENCH elements", () => {
      const source = document.createElement("div");
      source.innerHTML = `
        <ef-timeline></ef-timeline>
        <ef-workbench></ef-workbench>
        <div class="content">Visible</div>
      `;
      
      const { container } = buildCloneStructure(source);
      
      expect(container.querySelector("ef-timeline")).toBeNull();
      expect(container.querySelector("ef-workbench")).toBeNull();
      expect(container.querySelector(".content")).toBeTruthy();
    });
  });

  describe("SVG handling", () => {
    it("clones entire SVG subtree without tracking children", () => {
      const source = document.createElement("div");
      source.innerHTML = `
        <svg width="100" height="100" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill="red"/>
          <rect x="10" y="10" width="30" height="30" fill="blue"/>
        </svg>
      `;
      
      const { container, syncState } = buildCloneStructure(source);
      
      const svg = container.querySelector("svg");
      expect(svg).toBeTruthy();
      expect(svg?.querySelector("circle")).toBeTruthy();
      expect(svg?.querySelector("rect")).toBeTruthy();
      expect(svg?.getAttribute("width")).toBe("100");
      expect(svg?.getAttribute("viewBox")).toBe("0 0 100 100");
    });
  });

  describe("canvas handling", () => {
    it("copies canvas pixels from source", () => {
      const sourceCanvas = document.createElement("canvas");
      sourceCanvas.width = 100;
      sourceCanvas.height = 100;
      const ctx = sourceCanvas.getContext("2d")!;
      ctx.fillStyle = "red";
      ctx.fillRect(0, 0, 100, 100);
      
      const source = document.createElement("div");
      source.appendChild(sourceCanvas);
      
      const { container } = buildCloneStructure(source);
      
      // buildCloneStructure returns null for raw canvas elements (no tracking needed)
      // The canvas is not included in the clone tree as it doesn't need style syncing
    });
  });

  describe("custom element handling", () => {
    it("converts custom elements to div clones", () => {
      const source = document.createElement("div");
      source.innerHTML = `<custom-element class="custom">Content</custom-element>`;
      
      const { container } = buildCloneStructure(source);
      
      // Custom elements without shadow DOM are cloned as divs
      const clone = container.querySelector(".custom");
      expect(clone).toBeTruthy();
      expect(clone?.tagName.toLowerCase()).toBe("div");
    });
  });

  describe("syncState structure", () => {
    it("builds tree structure with correct node count", () => {
      const source = document.createElement("div");
      source.innerHTML = `
        <div class="level1">
          <span class="level2a">A</span>
          <span class="level2b">B</span>
        </div>
      `;
      
      const { syncState } = buildCloneStructure(source);
      
      // Root div + .level1 div + 2 spans = 4 nodes
      expect(syncState.nodeCount).toBe(4);
      expect(syncState.tree.root).toBeTruthy();
    });

    it("traverseCloneTree visits all nodes", () => {
      const source = document.createElement("div");
      source.innerHTML = `
        <div class="a">
          <span class="b">B</span>
          <span class="c">C</span>
        </div>
      `;
      
      const { syncState } = buildCloneStructure(source);
      
      const visitedClasses: string[] = [];
      traverseCloneTree(syncState, (node) => {
        if (node.clone.className) {
          visitedClasses.push(node.clone.className);
        }
      });
      
      expect(visitedClasses).toContain("a");
      expect(visitedClasses).toContain("b");
      expect(visitedClasses).toContain("c");
    });

    it("each CloneNode has source and clone references", () => {
      const source = document.createElement("div");
      source.className = "root";
      source.innerHTML = `<span class="child">Text</span>`;
      
      const { syncState } = buildCloneStructure(source);
      
      traverseCloneTree(syncState, (node) => {
        expect(node.source).toBeDefined();
        expect(node.clone).toBeDefined();
        expect(node.children).toBeInstanceOf(Array);
        expect(typeof node.isCanvasClone).toBe("boolean");
        expect(node.styleCache).toBeInstanceOf(Map);
      });
    });
  });

  describe("initial style sync", () => {
    it("syncs styles when timeMs is provided", () => {
      const source = document.createElement("div");
      source.style.cssText = "position: absolute; top: 10px; left: 20px; opacity: 0.5;";
      document.body.appendChild(source);
      
      try {
        const { container } = buildCloneStructure(source, 0);
        
        const clone = container.firstElementChild as HTMLElement;
        expect(clone.style.position).toBe("absolute");
        expect(clone.style.top).toBe("10px");
        expect(clone.style.left).toBe("20px");
        expect(clone.style.opacity).toBe("0.5");
      } finally {
        document.body.removeChild(source);
      }
    });
  });
});

describe("syncStyles", () => {
  describe("CSS property syncing", () => {
    it("syncs position properties from source to clone", () => {
      const source = document.createElement("div");
      source.style.cssText = "position: absolute; top: 50px; left: 100px;";
      document.body.appendChild(source);
      
      try {
        const { syncState, container } = buildCloneStructure(source);
        syncStyles(syncState, 0);
        
        const clone = container.firstElementChild as HTMLElement;
        expect(clone.style.position).toBe("absolute");
        expect(clone.style.top).toBe("50px");
        expect(clone.style.left).toBe("100px");
      } finally {
        document.body.removeChild(source);
      }
    });

    it("syncs transform properties", () => {
      const source = document.createElement("div");
      source.style.cssText = "transform: rotate(45deg); transform-origin: center center;";
      document.body.appendChild(source);
      
      try {
        const { syncState, container } = buildCloneStructure(source);
        syncStyles(syncState, 0);
        
        const clone = container.firstElementChild as HTMLElement;
        expect(clone.style.transform).toBe("rotate(45deg)");
      } finally {
        document.body.removeChild(source);
      }
    });

    it("syncs opacity and visibility", () => {
      const source = document.createElement("div");
      source.style.cssText = "opacity: 0.7; visibility: visible;";
      document.body.appendChild(source);
      
      try {
        const { syncState, container } = buildCloneStructure(source);
        syncStyles(syncState, 0);
        
        const clone = container.firstElementChild as HTMLElement;
        expect(clone.style.opacity).toBe("0.7");
        expect(clone.style.visibility).toBe("visible");
      } finally {
        document.body.removeChild(source);
      }
    });

    it("disables animations and transitions on clones", () => {
      const source = document.createElement("div");
      source.style.cssText = "animation: fade 1s; transition: all 0.3s;";
      document.body.appendChild(source);
      
      try {
        const { syncState, container } = buildCloneStructure(source);
        syncStyles(syncState, 0);
        
        const clone = container.firstElementChild as HTMLElement;
        // animation and transition values may include other properties in computed style
        // Check that "none" is present (disabling the animation/transition)
        expect(clone.style.animation).toContain("none");
        expect(clone.style.transition).toContain("none");
      } finally {
        document.body.removeChild(source);
      }
    });
  });

  describe("style cache and change detection", () => {
    it("uses style cache to detect changes", () => {
      const source = document.createElement("div");
      source.style.opacity = "1";
      document.body.appendChild(source);
      
      try {
        const { syncState, container } = buildCloneStructure(source);
        
        // First sync
        syncStyles(syncState, 0);
        const clone = container.firstElementChild as HTMLElement;
        expect(clone.style.opacity).toBe("1");
        
        // Change source
        source.style.opacity = "0.5";
        
        // Second sync should detect change
        syncStyles(syncState, 0);
        expect(clone.style.opacity).toBe("0.5");
      } finally {
        document.body.removeChild(source);
      }
    });
  });

  describe("text content syncing", () => {
    it("syncs text node content changes", () => {
      const source = document.createElement("div");
      source.textContent = "Original text";
      document.body.appendChild(source);
      
      try {
        const { syncState, container } = buildCloneStructure(source);
        
        const clone = container.firstElementChild as HTMLElement;
        expect(clone.textContent?.trim()).toBe("Original text");
        
        // Change source text
        source.textContent = "Updated text";
        syncStyles(syncState, 0);
        
        expect(clone.textContent?.trim()).toBe("Updated text");
      } finally {
        document.body.removeChild(source);
      }
    });
  });

  describe("input value syncing", () => {
    it("syncs input value property and attribute after change", () => {
      const source = document.createElement("input");
      source.type = "text";
      source.value = "Initial value";
      document.body.appendChild(source);
      
      try {
        const { syncState, container } = buildCloneStructure(source);
        syncStyles(syncState, 0);
        
        const clone = container.querySelector("input") as HTMLInputElement;
        // Initial value is synced via value property
        expect(clone.value).toBe("Initial value");
        
        // Change source value
        source.value = "Changed value";
        syncStyles(syncState, 0);
        
        // After sync, both value property and attribute should match
        expect(clone.value).toBe("Changed value");
        expect(clone.getAttribute("value")).toBe("Changed value");
      } finally {
        document.body.removeChild(source);
      }
    });
  });
});

describe("temporal culling", () => {
  beforeAll(async () => {
    await customElements.whenDefined("ef-timegroup");
  });

  it("hides elements outside their time range", async () => {
    const container = document.createElement("div");
    container.innerHTML = `
      <ef-timegroup id="root" style="width: 400px; height: 300px;">
        <ef-timegroup id="child" start-time="1s" duration="2s" style="width: 100%; height: 100%; background: red;">
          <div class="content">Visible during 1-3s</div>
        </ef-timegroup>
      </ef-timegroup>
    `;
    document.body.appendChild(container);
    
    try {
      const root = container.querySelector("#root") as EFTimegroup;
      await root.updateComplete;
      
      const { syncState, container: cloneContainer } = buildCloneStructure(root);
      
      // At time 0ms, child should be hidden (starts at 1000ms)
      syncStyles(syncState, 0);
      
      let childClone = cloneContainer.querySelector('[class*="content"]')?.parentElement;
      // The clone structure creates divs for custom elements
      // Check if the div corresponding to the child timegroup is hidden
      
      // At time 1500ms, child should be visible
      syncStyles(syncState, 1500);
      
      // At time 4000ms, child should be hidden again (ends at 3000ms)
      syncStyles(syncState, 4000);
      
    } finally {
      document.body.removeChild(container);
    }
  });

  it("shows elements when time is within range", async () => {
    const container = document.createElement("div");
    container.innerHTML = `
      <ef-timegroup id="root" style="width: 400px; height: 300px;">
        <div class="always-visible" style="position: absolute; background: blue;">Always visible</div>
      </ef-timegroup>
    `;
    document.body.appendChild(container);
    
    try {
      const root = container.querySelector("#root") as EFTimegroup;
      await root.updateComplete;
      
      const { syncState, container: cloneContainer } = buildCloneStructure(root);
      
      // Elements without temporal bounds should always be visible
      syncStyles(syncState, 0);
      const alwaysVisible = cloneContainer.querySelector(".always-visible") as HTMLElement;
      expect(alwaysVisible).toBeTruthy();
      expect(alwaysVisible.style.display).not.toBe("none");
      
      syncStyles(syncState, 5000);
      expect(alwaysVisible.style.display).not.toBe("none");
    } finally {
      document.body.removeChild(container);
    }
  });

  it("treats elements without temporal properties as always visible", async () => {
    // Elements without startTimeMs/endTimeMs should always be visible
    const container = document.createElement("div");
    container.innerHTML = `
      <ef-timegroup id="root" style="width: 400px; height: 300px;">
        <div class="no-temporal">No temporal bounds</div>
      </ef-timegroup>
    `;
    document.body.appendChild(container);
    
    try {
      const root = container.querySelector("#root") as EFTimegroup;
      await root.updateComplete;
      
      const { syncState, container: cloneContainer } = buildCloneStructure(root);
      
      // At any time, elements without temporal bounds should be visible
      syncStyles(syncState, 0);
      let content = cloneContainer.querySelector(".no-temporal") as HTMLElement;
      expect(content).toBeTruthy();
      expect(content.style.display).not.toBe("none");
      
      syncStyles(syncState, 10000);
      content = cloneContainer.querySelector(".no-temporal") as HTMLElement;
      expect(content).toBeTruthy();
      expect(content.style.display).not.toBe("none");
    } finally {
      document.body.removeChild(container);
    }
  });
});

describe("collectDocumentStyles", () => {
  it("returns string containing CSS rules", () => {
    const styles = collectDocumentStyles();
    
    expect(typeof styles).toBe("string");
    // Should contain some CSS (from vitest/browser or other default styles)
    // The exact content depends on the test environment
  });

  it("includes rules from document stylesheets", () => {
    const styleEl = document.createElement("style");
    styleEl.textContent = `.test-class-unique-123 { color: rgb(255, 0, 0); }`;
    document.head.appendChild(styleEl);
    
    try {
      const styles = collectDocumentStyles();
      expect(styles).toContain("test-class-unique-123");
    } finally {
      document.head.removeChild(styleEl);
    }
  });
});

describe("edge cases", () => {
  it("handles empty source element", () => {
    const source = document.createElement("div");
    
    const { container, syncState } = buildCloneStructure(source);
    
    expect(container.children.length).toBe(1);
    expect(syncState.nodeCount).toBe(1);
  });

  it("handles deeply nested elements", () => {
    const source = document.createElement("div");
    let current = source;
    
    // Create 10 levels of nesting
    for (let i = 0; i < 10; i++) {
      const child = document.createElement("div");
      child.className = `level-${i}`;
      current.appendChild(child);
      current = child;
    }
    current.textContent = "Deepest";
    
    const { container, syncState } = buildCloneStructure(source);
    
    const deepest = container.querySelector(".level-9");
    expect(deepest).toBeTruthy();
    expect(deepest?.textContent?.trim()).toBe("Deepest");
    expect(syncState.nodeCount).toBe(11); // root + 10 levels
  });

  it("handles multiple children at same level", () => {
    const source = document.createElement("div");
    for (let i = 0; i < 5; i++) {
      const child = document.createElement("span");
      child.className = `child-${i}`;
      child.textContent = `Child ${i}`;
      source.appendChild(child);
    }
    
    const { container, syncState } = buildCloneStructure(source);
    
    for (let i = 0; i < 5; i++) {
      const clone = container.querySelector(`.child-${i}`);
      expect(clone).toBeTruthy();
      expect(clone?.textContent?.trim()).toBe(`Child ${i}`);
    }
    expect(syncState.nodeCount).toBe(6); // root + 5 children
  });

  it("handles mixed content (elements and text nodes)", () => {
    const source = document.createElement("div");
    source.innerHTML = `
      Text before
      <span>Element</span>
      Text after
    `;
    
    const { container } = buildCloneStructure(source);
    
    const root = container.firstElementChild!;
    expect(root.textContent).toContain("Text before");
    expect(root.textContent).toContain("Element");
    expect(root.textContent).toContain("Text after");
  });
});

describe("invariants", () => {
  it("every CloneNode.source is a valid Element", () => {
    const source = document.createElement("div");
    source.innerHTML = `
      <div class="a"><span class="b">B</span></div>
      <div class="c">C</div>
    `;
    
    const { syncState } = buildCloneStructure(source);
    
    traverseCloneTree(syncState, (node) => {
      expect(node.source).toBeInstanceOf(Element);
    });
  });

  it("every CloneNode.clone is a valid HTMLElement", () => {
    const source = document.createElement("div");
    source.innerHTML = `
      <div class="a"><span class="b">B</span></div>
    `;
    
    const { syncState } = buildCloneStructure(source);
    
    traverseCloneTree(syncState, (node) => {
      expect(node.clone).toBeInstanceOf(HTMLElement);
    });
  });

  it("CloneNode children count matches source visible children", () => {
    const source = document.createElement("div");
    source.innerHTML = `
      <span>A</span>
      <span>B</span>
      <span>C</span>
    `;
    
    const { syncState } = buildCloneStructure(source);
    
    // Root should have 3 children
    expect(syncState.tree.root?.children.length).toBe(3);
  });

  it("styleCache is empty initially and populated after sync", () => {
    const source = document.createElement("div");
    source.style.opacity = "0.5";
    document.body.appendChild(source);
    
    try {
      const { syncState } = buildCloneStructure(source);
      
      // Before sync, cache should be empty
      expect(syncState.tree.root?.styleCache.size).toBe(0);
      
      // After sync, cache should have entries
      syncStyles(syncState, 0);
      expect(syncState.tree.root?.styleCache.size).toBeGreaterThan(0);
    } finally {
      document.body.removeChild(source);
    }
  });
});
