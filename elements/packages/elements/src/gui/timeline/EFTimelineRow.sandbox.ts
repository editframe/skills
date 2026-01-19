import { defineSandbox } from "../../sandbox/index.js";
import { html } from "lit";
import type { EFTimelineRow } from "./EFTimelineRow.js";
import "./EFTimelineRow.js";
import "./TimelineStateProvider.js";
import "../../elements/EFVideo.js";
import "../../elements/EFTimegroup.js";
import "../../elements/EFAudio.js";
import "../../elements/EFImage.js";

export default defineSandbox({
  name: "EFTimelineRow",
  description: "Timeline row component with label and track rendering",
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
      <div style="width: 1000px; background: #1a1a2e;">
        <ef-timeline-row
          .element=${(() => {
            const video = document.createElement("ef-video");
            video.id = "test-video";
            video.setAttribute("src", "data:video/mp4;base64,");
            video.setAttribute("duration", "5s");
            return video;
          })()}
          depth="0"
          pixels-per-ms="0.1"
        ></ef-timeline-row>
      </div>
    </timeline-state-provider>
  `,
  
  scenarios: {
    async "renders with video element"(ctx: any) {
      const container = ctx.getContainer();
      const provider = document.createElement("timeline-state-provider");
      provider.setAttribute("pixels-per-ms", "0.1");
      provider.setAttribute("duration-ms", "5000");
      provider.setAttribute("viewport-width", "800");
      
      const video = document.createElement("ef-video");
      video.id = "test-video-1";
      video.setAttribute("duration", "5s");
      
      const row = document.createElement("ef-timeline-row");
      (row as any).element = video;
      row.setAttribute("depth", "0");
      row.setAttribute("pixels-per-ms", "0.1");
      
      provider.appendChild(row);
      container.appendChild(provider);
      
      await ctx.frame();
      
      const rowElement = ctx.querySelector<EFTimelineRow>("ef-timeline-row")!;
      ctx.expect(rowElement).toBeDefined();
      ctx.expect(rowElement.element).toBeDefined();
    },
    
    async "renders label with correct indent"(ctx: any) {
      const container = ctx.getContainer();
      const provider = document.createElement("timeline-state-provider");
      provider.setAttribute("pixels-per-ms", "0.1");
      
      const video = document.createElement("ef-video");
      video.id = "test-video-2";
      video.setAttribute("duration", "5s");
      
      const row = document.createElement("ef-timeline-row") as EFTimelineRow;
      (row as any).element = video;
      row.setAttribute("depth", "2");
      row.setAttribute("pixels-per-ms", "0.1");
      
      provider.appendChild(row);
      container.appendChild(provider);
      
      await ctx.frame();
      
      const shadowRoot = row.shadowRoot;
      const label = shadowRoot?.querySelector(".row-label") as HTMLElement;
      
      ctx.expect(label).toBeDefined();
      const paddingLeft = parseInt(label?.style.paddingLeft || "0", 10);
      ctx.expect(paddingLeft).toBe(32);
    },
    
    async "renders video track for EFVideo element"(ctx: any) {
      const container = ctx.getContainer();
      const provider = document.createElement("timeline-state-provider");
      provider.setAttribute("pixels-per-ms", "0.1");
      
      const video = document.createElement("ef-video");
      video.id = "test-video-3";
      video.setAttribute("duration", "5s");
      
      const row = document.createElement("ef-timeline-row");
      (row as any).element = video;
      row.setAttribute("depth", "0");
      row.setAttribute("pixels-per-ms", "0.1");
      
      provider.appendChild(row);
      container.appendChild(provider);
      
      await ctx.frame();
      
      const rowElement = ctx.querySelector<EFTimelineRow>("ef-timeline-row")!;
      const shadowRoot = rowElement.shadowRoot;
      const track = shadowRoot?.querySelector(".row-track");
      
      ctx.expect(track).toBeDefined();
      const videoTrack = shadowRoot?.querySelector("ef-video-track");
      ctx.expect(videoTrack).toBeDefined();
    },
    
    async "renders timegroup track for EFTimegroup element"(ctx: any) {
      const container = ctx.getContainer();
      const provider = document.createElement("timeline-state-provider");
      provider.setAttribute("pixels-per-ms", "0.1");
      
      const timegroup = document.createElement("ef-timegroup");
      timegroup.id = "test-timegroup-1";
      timegroup.setAttribute("duration", "5s");
      
      const row = document.createElement("ef-timeline-row") as EFTimelineRow;
      (row as any).element = timegroup;
      row.setAttribute("depth", "0");
      row.setAttribute("pixels-per-ms", "0.1");
      
      provider.appendChild(row);
      container.appendChild(provider);
      
      await ctx.frame();
      
      const shadowRoot = row.shadowRoot;
      const timegroupTrack = shadowRoot?.querySelector("ef-timegroup-track");
      
      ctx.expect(timegroupTrack).toBeDefined();
    },
    
    async "highlights on hover"(ctx: any) {
      const container = ctx.getContainer();
      const provider = document.createElement("timeline-state-provider");
      provider.setAttribute("pixels-per-ms", "0.1");
      
      const video = document.createElement("ef-video");
      video.id = "test-video-4";
      video.setAttribute("duration", "5s");
      
      const row = document.createElement("ef-timeline-row") as EFTimelineRow;
      (row as any).element = video;
      row.setAttribute("depth", "0");
      row.setAttribute("pixels-per-ms", "0.1");
      
      provider.appendChild(row);
      container.appendChild(provider);
      
      await ctx.frame();
      
      (row as any).highlightedElement = video;
      await ctx.frame();
      
      ctx.expect(row.classList.contains("hovered")).toBe(true);
    },
    
    async "shows selected state"(ctx: any) {
      const container = ctx.getContainer();
      const provider = document.createElement("timeline-state-provider");
      provider.setAttribute("pixels-per-ms", "0.1");
      
      const video = document.createElement("ef-video");
      video.id = "test-video-5";
      video.setAttribute("duration", "5s");
      
      const row = document.createElement("ef-timeline-row") as EFTimelineRow;
      (row as any).element = video;
      row.setAttribute("depth", "0");
      row.setAttribute("pixels-per-ms", "0.1");
      
      provider.appendChild(row);
      container.appendChild(provider);
      
      await ctx.frame();
      
      (row as any).selectedIds = new Set(["test-video-5"]);
      await ctx.frame();
      
      ctx.expect(row.classList.contains("selected")).toBe(true);
    },
    
    async "dispatches row-select event on click"(ctx: any) {
      const container = ctx.getContainer();
      const provider = document.createElement("timeline-state-provider");
      provider.setAttribute("pixels-per-ms", "0.1");
      
      const video = document.createElement("ef-video");
      video.id = "test-video-6";
      video.setAttribute("duration", "5s");
      
      const row = document.createElement("ef-timeline-row") as EFTimelineRow;
      (row as any).element = video;
      row.setAttribute("depth", "0");
      row.setAttribute("pixels-per-ms", "0.1");
      
      provider.appendChild(row);
      container.appendChild(provider);
      
      await ctx.frame();
      
      let eventFired = false;
      let eventDetail: any = null;
      
      row.addEventListener("row-select", (e: Event) => {
        eventFired = true;
        eventDetail = (e as CustomEvent).detail;
      });
      
      const shadowRoot = row.shadowRoot;
      const label = shadowRoot?.querySelector(".row-label") as HTMLElement;
      label?.click();
      
      await ctx.frame();
      
      ctx.expect(eventFired).toBe(true);
      ctx.expect(eventDetail?.elementId).toBe("test-video-6");
    },
    
    async "renders audio track for EFAudio element"(ctx: any) {
      const container = ctx.getContainer();
      const provider = document.createElement("timeline-state-provider");
      provider.setAttribute("pixels-per-ms", "0.1");
      
      const audio = document.createElement("ef-audio");
      audio.id = "test-audio-1";
      audio.setAttribute("duration", "5s");
      
      const row = document.createElement("ef-timeline-row") as EFTimelineRow;
      (row as any).element = audio;
      row.setAttribute("depth", "0");
      row.setAttribute("pixels-per-ms", "0.1");
      
      provider.appendChild(row);
      container.appendChild(provider);
      
      await ctx.frame();
      
      const shadowRoot = row.shadowRoot;
      const audioTrack = shadowRoot?.querySelector("ef-audio-track");
      
      ctx.expect(audioTrack).toBeDefined();
    },
    
    async "renders image track for EFImage element"(ctx: any) {
      const container = ctx.getContainer();
      const provider = document.createElement("timeline-state-provider");
      provider.setAttribute("pixels-per-ms", "0.1");
      
      const image = document.createElement("ef-image");
      image.id = "test-image-1";
      image.setAttribute("duration", "5s");
      
      const row = document.createElement("ef-timeline-row") as EFTimelineRow;
      (row as any).element = image;
      row.setAttribute("depth", "0");
      row.setAttribute("pixels-per-ms", "0.1");
      
      provider.appendChild(row);
      container.appendChild(provider);
      
      await ctx.frame();
      
      const shadowRoot = row.shadowRoot;
      const imageTrack = shadowRoot?.querySelector("ef-image-track");
      
      ctx.expect(imageTrack).toBeDefined();
    },
  },
});
