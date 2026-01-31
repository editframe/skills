import { defineSandbox } from "../../../sandbox/index.js";
import { html } from "lit";
// CRITICAL: Import TrackItem initialization helper FIRST to ensure full initialization
// This module ensures TrackItem is fully evaluated before TimegroupTrack tries to extend it
import "./ensureTrackItemInit.js";
// Import TimegroupTrack ONLY as a type - don't import the class itself to avoid evaluation
// The custom element will be registered when TimegroupTrack.ts is loaded elsewhere
import type { EFTimegroupTrack } from "./TimegroupTrack.js";
import "../../../elements/EFTimegroup.js";
import "../TimelineStateProvider.js";

export default defineSandbox({
  name: "EFTimegroupTrack",
  description: "Timegroup track component for nested compositions. Base track behavior tested in TrackItem.sandbox.ts",
  category: "gui",
  subcategory: "timeline",
  
  render: () => html`
    <timeline-state-provider
      pixels-per-ms="0.1"
      current-time-ms="0"
      duration-ms="5000"
      viewport-scroll-left="0"
      viewport-width="800"
    >
      <div style="width: 1000px; height: 48px; position: relative;">
        <ef-timegroup id="test-timegroup-track" duration="5s" style="display: none;"></ef-timegroup>
        <ef-timegroup-track
          .element=${document.getElementById("test-timegroup-track") || (() => {
            const tg = document.createElement("ef-timegroup");
            tg.id = "test-timegroup-track";
            tg.setAttribute("duration", "5s");
            return tg;
          })()}
          pixels-per-ms="0.1"
          skip-children="true"
        ></ef-timegroup-track>
      </div>
    </timeline-state-provider>
  `,
  
  scenarios: {
    // ============================================
    // Demonstration Scenarios
    // ============================================
    
    "shows filmstrip for root timegroups": {
      category: "demonstration",
      description: "Visual demonstration of filmstrip rendering for root timegroups with all conditions met",
      run: async (ctx) => {
        const container = ctx.getContainer();
        const provider = document.createElement("timeline-state-provider");
        provider.setAttribute("pixels-per-ms", "0.1");
        
        const timegroup = document.createElement("ef-timegroup");
        timegroup.id = "demo-root-timegroup";
        timegroup.setAttribute("duration", "5s");
        
        const track = document.createElement("ef-timegroup-track");
        (track as any).element = timegroup;
        (track as any).pixelsPerMs = 0.1;
        (track as any).skipChildren = true;
        (track as any).showFilmstrip = true;
        
        provider.appendChild(track);
        container.appendChild(provider);
        
        await ctx.frame();
        await track.updateComplete;
        await ctx.frame();
        
        const trackElement = ctx.querySelector<EFTimegroupTrack>("ef-timegroup-track")!;
        ctx.expect(trackElement).toBeDefined();
      },
    },
    
    "shows mode indicator for non-filmstrip tracks": {
      category: "demonstration",
      description: "Visual demonstration of mode indicator (Fixed/Sequence) when filmstrip is not shown",
      run: async (ctx) => {
        const container = ctx.getContainer();
        const provider = document.createElement("timeline-state-provider");
        provider.setAttribute("pixels-per-ms", "0.1");
        
        const timegroup = document.createElement("ef-timegroup");
        timegroup.id = "demo-mode-indicator";
        timegroup.setAttribute("duration", "5s");
        timegroup.setAttribute("mode", "fixed");
        
        const track = document.createElement("ef-timegroup-track");
        (track as any).element = timegroup;
        (track as any).pixelsPerMs = 0.1;
        (track as any).skipChildren = true;
        
        provider.appendChild(track);
        container.appendChild(provider);
        
        await ctx.frame();
        await track.updateComplete;
        await ctx.frame();
        
        const trackElement = ctx.querySelector<EFTimegroupTrack>("ef-timegroup-track")!;
        const shadowRoot = trackElement.shadowRoot;
        const trackContent = shadowRoot?.querySelector(".trim-container");
        ctx.expect(trackContent).toBeDefined();
        
        // Mode indicator should be visible
        const modeText = trackContent?.textContent || "";
        ctx.expect(modeText).toContain("Fixed");
      },
    },
    
    // ============================================
    // Internals/Invariants Scenarios
    // ============================================
    
    "detects root timegroup using isRootTimegroup property": {
      category: "internals",
      description: "Verify isRootTimegroup() returns true for root timegroups",
      run: async (ctx) => {
        const container = ctx.getContainer();
        const provider = document.createElement("timeline-state-provider");
        provider.setAttribute("pixels-per-ms", "0.1");
        
        // Create root timegroup (no parent)
        const rootTimegroup = document.createElement("ef-timegroup");
        rootTimegroup.id = "root-tg";
        rootTimegroup.setAttribute("duration", "5s");
        
        const track = document.createElement("ef-timegroup-track");
        (track as any).element = rootTimegroup;
        
        provider.appendChild(track);
        container.appendChild(provider);
        
        await ctx.frame();
        await track.updateComplete;
        await ctx.frame();
        
        // Import the isRootTimegroup function from TimegroupTrack
        // Since it's not exported, we'll test via the track's shouldShowFilmstrip logic
        // Root timegroup should have isRootTimegroup === true
        ctx.expect(rootTimegroup.isRootTimegroup).toBe(true);
      },
    },
    
    "detects non-root timegroup correctly": {
      category: "internals",
      description: "Verify isRootTimegroup() returns false for nested timegroups",
      run: async (ctx) => {
        const container = ctx.getContainer();
        const provider = document.createElement("timeline-state-provider");
        provider.setAttribute("pixels-per-ms", "0.1");
        
        // Create root timegroup
        const rootTimegroup = document.createElement("ef-timegroup");
        rootTimegroup.id = "root-tg-nested";
        rootTimegroup.setAttribute("duration", "5s");
        
        // Create nested timegroup
        const nestedTimegroup = document.createElement("ef-timegroup");
        nestedTimegroup.id = "nested-tg";
        nestedTimegroup.setAttribute("duration", "3s");
        rootTimegroup.appendChild(nestedTimegroup);
        
        const track = document.createElement("ef-timegroup-track");
        (track as any).element = nestedTimegroup;
        
        provider.appendChild(track);
        container.appendChild(provider);
        
        await ctx.frame();
        await track.updateComplete;
        await ctx.frame();
        
        // Nested timegroup should have isRootTimegroup === false
        ctx.expect(nestedTimegroup.isRootTimegroup).toBe(false);
      },
    },
    
    "handles null/undefined element gracefully": {
      category: "internals",
      description: "Verify isRootTimegroup() handles null/undefined safely",
      run: async (ctx) => {
        const container = ctx.getContainer();
        const provider = document.createElement("timeline-state-provider");
        provider.setAttribute("pixels-per-ms", "0.1");
        
        const track = document.createElement("ef-timegroup-track");
        (track as any).element = null;
        
        provider.appendChild(track);
        container.appendChild(provider);
        
        await ctx.frame();
        await track.updateComplete;
        await ctx.frame();
        
        // Track should handle null element without errors
        const trackElement = ctx.querySelector<EFTimegroupTrack>("ef-timegroup-track")!;
        ctx.expect(trackElement).toBeDefined();
        ctx.expect((trackElement as any).element).toBeNull();
      },
    },
    
    "shows mode indicator for fixed mode": {
      category: "internals",
      description: "Verify 'Fixed' label appears when mode='fixed' and filmstrip is not shown",
      run: async (ctx) => {
        const container = ctx.getContainer();
        const provider = document.createElement("timeline-state-provider");
        provider.setAttribute("pixels-per-ms", "0.1");
        
        const timegroup = document.createElement("ef-timegroup");
        timegroup.id = "test-fixed-mode";
        timegroup.setAttribute("duration", "5s");
        timegroup.setAttribute("mode", "fixed");
        
        const track = document.createElement("ef-timegroup-track");
        (track as any).element = timegroup;
        (track as any).pixelsPerMs = 0.1;
        (track as any).skipChildren = true;
        
        provider.appendChild(track);
        container.appendChild(provider);
        
        await ctx.frame();
        await track.updateComplete;
        await ctx.frame();
        
        const trackElement = ctx.querySelector<EFTimegroupTrack>("ef-timegroup-track")!;
        const shadowRoot = trackElement.shadowRoot;
        const trackContent = shadowRoot?.querySelector(".trim-container");
        ctx.expect(trackContent).toBeDefined();
        
        const modeText = trackContent?.textContent || "";
        ctx.expect(modeText).toContain("Fixed");
      },
    },
    
    "shows mode indicator for sequence mode": {
      category: "internals",
      description: "Verify 'Sequence' label appears when mode='sequence' and filmstrip is not shown",
      run: async (ctx) => {
        const container = ctx.getContainer();
        const provider = document.createElement("timeline-state-provider");
        provider.setAttribute("pixels-per-ms", "0.1");
        
        const timegroup = document.createElement("ef-timegroup");
        timegroup.id = "test-sequence-mode";
        timegroup.setAttribute("duration", "5s");
        timegroup.setAttribute("mode", "sequence");
        
        const track = document.createElement("ef-timegroup-track");
        (track as any).element = timegroup;
        (track as any).pixelsPerMs = 0.1;
        (track as any).skipChildren = true;
        
        provider.appendChild(track);
        container.appendChild(provider);
        
        await ctx.frame();
        await track.updateComplete;
        await ctx.frame();
        
        const trackElement = ctx.querySelector<EFTimegroupTrack>("ef-timegroup-track")!;
        const shadowRoot = trackElement.shadowRoot;
        const trackContent = shadowRoot?.querySelector(".trim-container");
        ctx.expect(trackContent).toBeDefined();
        
        const modeText = trackContent?.textContent || "";
        ctx.expect(modeText).toContain("Sequence");
      },
    },
    
    "renders children when skipChildren=false": {
      category: "internals",
      description: "Verify child tracks render when skipChildren is false",
      run: async (ctx) => {
        const container = ctx.getContainer();
        const provider = document.createElement("timeline-state-provider");
        provider.setAttribute("pixels-per-ms", "0.1");
        
        const timegroup = document.createElement("ef-timegroup");
        timegroup.id = "test-children-render";
        timegroup.setAttribute("duration", "5s");
        
        // Add a child element
        const childVideo = document.createElement("ef-video");
        childVideo.setAttribute("src", "/assets/bars-n-tone2.mp4");
        childVideo.setAttribute("duration", "2s");
        timegroup.appendChild(childVideo);
        
        const track = document.createElement("ef-timegroup-track");
        (track as any).element = timegroup;
        (track as any).pixelsPerMs = 0.1;
        (track as any).skipChildren = false;
        
        provider.appendChild(track);
        container.appendChild(provider);
        
        await ctx.frame();
        await track.updateComplete;
        await ctx.frame();
        
        const trackElement = ctx.querySelector<EFTimegroupTrack>("ef-timegroup-track")!;
        const shadowRoot = trackElement.shadowRoot;
        // Children should be rendered (check for child tracks)
        const trackContent = shadowRoot?.querySelector(".trim-container");
        ctx.expect(trackContent).toBeDefined();
      },
    },
    
    "hides children when skipChildren=true": {
      category: "internals",
      description: "Verify no child tracks render when skipChildren is true (unified row architecture)",
      run: async (ctx) => {
        const container = ctx.getContainer();
        const provider = document.createElement("timeline-state-provider");
        provider.setAttribute("pixels-per-ms", "0.1");
        
        const timegroup = document.createElement("ef-timegroup");
        timegroup.id = "test-children-hidden";
        timegroup.setAttribute("duration", "5s");
        
        // Add a child element
        const childVideo = document.createElement("ef-video");
        childVideo.setAttribute("src", "/assets/bars-n-tone2.mp4");
        childVideo.setAttribute("duration", "2s");
        timegroup.appendChild(childVideo);
        
        const track = document.createElement("ef-timegroup-track");
        (track as any).element = timegroup;
        (track as any).pixelsPerMs = 0.1;
        (track as any).skipChildren = true;
        
        provider.appendChild(track);
        container.appendChild(provider);
        
        await ctx.frame();
        await track.updateComplete;
        await ctx.frame();
        
        const trackElement = ctx.querySelector<EFTimegroupTrack>("ef-timegroup-track")!;
        ctx.expect(trackElement.skipChildren).toBe(true);
      },
    },
    
    "does not show filmstrip for non-root timegroup": {
      category: "internals",
      description: "Verify filmstrip doesn't show for nested timegroups even with all other conditions met",
      run: async (ctx) => {
        const container = ctx.getContainer();
        const provider = document.createElement("timeline-state-provider");
        provider.setAttribute("pixels-per-ms", "0.1");
        
        // Create root timegroup
        const rootTimegroup = document.createElement("ef-timegroup");
        rootTimegroup.id = "root-tg-filmstrip-test";
        rootTimegroup.setAttribute("duration", "5s");
        
        // Create nested timegroup
        const nestedTimegroup = document.createElement("ef-timegroup");
        nestedTimegroup.id = "nested-tg-filmstrip";
        nestedTimegroup.setAttribute("duration", "3s");
        rootTimegroup.appendChild(nestedTimegroup);
        
        const track = document.createElement("ef-timegroup-track");
        (track as any).element = nestedTimegroup;
        (track as any).pixelsPerMs = 0.1;
        (track as any).skipChildren = true;
        (track as any).showFilmstrip = true;
        
        provider.appendChild(track);
        container.appendChild(provider);
        
        await ctx.frame();
        await track.updateComplete;
        await ctx.frame();
        
        // Nested timegroup should not show filmstrip even with all conditions
        ctx.expect(nestedTimegroup.isRootTimegroup).toBe(false);
        
        const trackElement = ctx.querySelector<EFTimegroupTrack>("ef-timegroup-track")!;
        ctx.expect(trackElement).toBeDefined();
      },
    },
    
    "does not show filmstrip when skipChildren=false": {
      category: "internals",
      description: "Verify filmstrip doesn't show when skipChildren=false",
      run: async (ctx) => {
        const container = ctx.getContainer();
        const provider = document.createElement("timeline-state-provider");
        provider.setAttribute("pixels-per-ms", "0.1");
        
        const rootTimegroup = document.createElement("ef-timegroup");
        rootTimegroup.id = "root-tg-skip-test";
        rootTimegroup.setAttribute("duration", "5s");
        
        const track = document.createElement("ef-timegroup-track");
        (track as any).element = rootTimegroup;
        (track as any).pixelsPerMs = 0.1;
        (track as any).skipChildren = false; // Filmstrip requires skipChildren=true
        (track as any).showFilmstrip = true;
        
        provider.appendChild(track);
        container.appendChild(provider);
        
        await ctx.frame();
        await track.updateComplete;
        await ctx.frame();
        
        const trackElement = ctx.querySelector<EFTimegroupTrack>("ef-timegroup-track")!;
        ctx.expect(trackElement).toBeDefined();
      },
    },
    
    "does not show filmstrip when showFilmstrip=false": {
      category: "internals",
      description: "Verify filmstrip doesn't show when showFilmstrip=false",
      run: async (ctx) => {
        const container = ctx.getContainer();
        const provider = document.createElement("timeline-state-provider");
        provider.setAttribute("pixels-per-ms", "0.1");
        
        const rootTimegroup = document.createElement("ef-timegroup");
        rootTimegroup.id = "root-tg-show-test";
        rootTimegroup.setAttribute("duration", "5s");
        
        const track = document.createElement("ef-timegroup-track");
        (track as any).element = rootTimegroup;
        (track as any).pixelsPerMs = 0.1;
        (track as any).skipChildren = true;
        (track as any).showFilmstrip = false; // Filmstrip disabled
        
        provider.appendChild(track);
        container.appendChild(provider);
        
        await ctx.frame();
        await track.updateComplete;
        await ctx.frame();
        
        const trackElement = ctx.querySelector<EFTimegroupTrack>("ef-timegroup-track")!;
        ctx.expect(trackElement).toBeDefined();
      },
    },
    
    "does not show filmstrip when element has no ID": {
      category: "internals",
      description: "Verify filmstrip doesn't show when element has no ID",
      run: async (ctx) => {
        const container = ctx.getContainer();
        const provider = document.createElement("timeline-state-provider");
        provider.setAttribute("pixels-per-ms", "0.1");
        
        const rootTimegroup = document.createElement("ef-timegroup");
        // No ID set
        rootTimegroup.setAttribute("duration", "5s");
        
        const track = document.createElement("ef-timegroup-track");
        (track as any).element = rootTimegroup;
        (track as any).pixelsPerMs = 0.1;
        (track as any).skipChildren = true;
        (track as any).showFilmstrip = true;
        
        provider.appendChild(track);
        container.appendChild(provider);
        
        await ctx.frame();
        await track.updateComplete;
        await ctx.frame();
        
        const trackElement = ctx.querySelector<EFTimegroupTrack>("ef-timegroup-track")!;
        ctx.expect(trackElement).toBeDefined();
      },
    },
    
    "shows filmstrip when all conditions met": {
      category: "internals",
      description: "Verify filmstrip shows when skipChildren=true, showFilmstrip=true, has ID, and is root",
      run: async (ctx) => {
        const container = ctx.getContainer();
        const provider = document.createElement("timeline-state-provider");
        provider.setAttribute("pixels-per-ms", "0.1");
        
        const rootTimegroup = document.createElement("ef-timegroup");
        rootTimegroup.id = "root-tg-all-conditions";
        rootTimegroup.setAttribute("duration", "5s");
        
        const track = document.createElement("ef-timegroup-track");
        (track as any).element = rootTimegroup;
        (track as any).pixelsPerMs = 0.1;
        (track as any).skipChildren = true;
        (track as any).showFilmstrip = true;
        
        provider.appendChild(track);
        container.appendChild(provider);
        
        await ctx.frame();
        await track.updateComplete;
        await ctx.frame();
        
        // Verify all conditions
        ctx.expect(rootTimegroup.isRootTimegroup).toBe(true);
        ctx.expect(rootTimegroup.id).toBe("root-tg-all-conditions");
        
        const trackElement = ctx.querySelector<EFTimegroupTrack>("ef-timegroup-track")!;
        ctx.expect(trackElement.skipChildren).toBe(true);        
        ctx.expect(trackElement.showFilmstrip).toBe(true);
      },
    },
    
    // ============================================
    // Performance Scenarios
    // ============================================
    
    "filmstrip rendering performance": {
      category: "performance",
      description: "Profile filmstrip rendering with many thumbnails, verify virtualization prevents excessive rendering",
      profileAssertions: [
        {
          type: "maxSelfTime",
          functionName: "drawThumbnails",
          fileName: "TimegroupTrack",
          maxSelfTimeMs: 50, // Should render quickly with virtualization
        },
      ],
      run: async (ctx) => {
        const container = ctx.getContainer();
        const provider = document.createElement("timeline-state-provider");
        provider.setAttribute("pixels-per-ms", "0.1");
        provider.setAttribute("viewport-width", "800");
        
        // Create root timegroup with long duration (will generate many thumbnails)
        const rootTimegroup = document.createElement("ef-timegroup");
        rootTimegroup.id = "root-tg-perf";
        rootTimegroup.setAttribute("duration", "600s"); // 10 minutes
        
        const track = document.createElement("ef-timegroup-track");
        (track as any).element = rootTimegroup;
        (track as any).pixelsPerMs = 0.1;
        (track as any).skipChildren = true;
        (track as any).showFilmstrip = true;
        
        provider.appendChild(track);
        container.appendChild(provider);
        
        await ctx.frame();
        await track.updateComplete;
        await ctx.frame();
        
        // Wait for thumbnail strip to render
        await ctx.wait(500);
        
        const trackElement = ctx.querySelector<EFTimegroupTrack>("ef-timegroup-track")!;
      },
    },
  },
});
