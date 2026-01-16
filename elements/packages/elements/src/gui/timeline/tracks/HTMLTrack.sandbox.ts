import { defineSandbox } from "../../../sandbox/index.js";
import { html } from "lit";
import type { EFHTMLTrack } from "./HTMLTrack.js";
import "./ensureTrackItemInit.js";
import "../TimelineStateProvider.js";

export default defineSandbox({
  name: "EFHTMLTrack",
  description: "HTML track component for displaying HTML content on timeline",
  category: "timeline",
  
  render: () => html`
    <timeline-state-provider
      pixels-per-ms="0.1"
      current-time-ms="0"
      duration-ms="5000"
      viewport-scroll-left="0"
      viewport-width="800"
    >
      <div style="width: 1000px; height: 48px; position: relative;">
        <div id="test-html-track" style="display: none;">
          <div style="padding: 10px; background: blue; color: white;">HTML Content</div>
        </div>
        <ef-html-track
          .element=${document.getElementById("test-html-track") || (() => {
            const div = document.createElement("div");
            div.id = "test-html-track";
            div.innerHTML = '<div style="padding: 10px; background: blue; color: white;">HTML Content</div>';
            return div;
          })()}
          pixels-per-ms="0.1"
        ></ef-html-track>
      </div>
    </timeline-state-provider>
  `,
  
  scenarios: {
    async "renders HTML track"(ctx) {
      const track = ctx.querySelector<EFHTMLTrack>("ef-html-track")!;
      
      await ctx.wait(100);
      await ctx.frame();
      
      ctx.expect(track).toBeDefined();
    },
    
    async "displays HTML element tag name"(ctx) {
      const track = ctx.querySelector<EFHTMLTrack>("ef-html-track")!;
      
      await ctx.wait(100);
      await ctx.frame();
      
      const shadowRoot = track.shadowRoot;
      const tagSpan = shadowRoot?.querySelector("span");
      
      ctx.expect(tagSpan).toBeDefined();
      ctx.expect(tagSpan?.textContent).toBe("DIV");
    },
    
    async "renders HTML children"(ctx) {
      const track = ctx.querySelector<EFHTMLTrack>("ef-html-track")!;
      
      await ctx.wait(100);
      await ctx.frame();
      
      const shadowRoot = track.shadowRoot;
      const children = shadowRoot?.querySelectorAll("ef-track-item");
      
      ctx.expect(children).toBeDefined();
    },
    
    async "handles trim bounds"(ctx) {
      const track = ctx.querySelector<EFHTMLTrack>("ef-html-track")!;
      const element = track.element as any;
      
      await ctx.wait(100);
      await ctx.frame();
      
      element.trimStartMs = 1000;
      element.trimEndMs = 4000;
      await ctx.frame();
      
      ctx.expect(element.trimStartMs).toBe(1000);
      ctx.expect(element.trimEndMs).toBe(4000);
    },
  },
});
