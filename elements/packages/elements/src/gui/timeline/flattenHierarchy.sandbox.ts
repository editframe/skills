import { defineSandbox } from "../../sandbox/index.js";
import { html } from "lit";
import { flattenHierarchy } from "./flattenHierarchy.js";
import "../../elements/EFTimegroup.js";
import "../../elements/EFVideo.js";
import "../../elements/EFAudio.js";
import "../../elements/EFImage.js";

export default defineSandbox({
  name: "flattenHierarchy",
  description: "Hierarchy flattening function for timeline rows",
  category: "layout",
  
  render: () => html`
    <div id="test-hierarchy-container" style="display: none;">
      <ef-timegroup id="root-timegroup" duration="10s" mode="fixed">
        <ef-video id="video-1" duration="5s"></ef-video>
        <ef-timegroup id="nested-timegroup" duration="3s" mode="fixed">
          <ef-audio id="audio-1" duration="2s"></ef-audio>
        </ef-timegroup>
      </ef-timegroup>
    </div>
  `,
  
  scenarios: {
    async "flattens nested timegroups correctly"(ctx) {
      const container = ctx.getContainer();
      
      const rootTimegroup = document.createElement("ef-timegroup");
      rootTimegroup.id = "root-tg-1";
      rootTimegroup.setAttribute("duration", "10s");
      rootTimegroup.setAttribute("mode", "fixed");
      
      const video = document.createElement("ef-video");
      video.id = "video-1";
      video.setAttribute("duration", "5s");
      
      const nestedTimegroup = document.createElement("ef-timegroup");
      nestedTimegroup.id = "nested-tg-1";
      nestedTimegroup.setAttribute("duration", "3s");
      nestedTimegroup.setAttribute("mode", "fixed");
      
      const audio = document.createElement("ef-audio");
      audio.id = "audio-1";
      audio.setAttribute("duration", "2s");
      
      nestedTimegroup.appendChild(audio);
      rootTimegroup.appendChild(video);
      rootTimegroup.appendChild(nestedTimegroup);
      container.appendChild(rootTimegroup);
      
      await ctx.frame();
      
      const rows = flattenHierarchy(rootTimegroup as any);
      
      // Should have: root timegroup, video, nested timegroup, audio
      ctx.expect(rows.length).toBe(4);
      ctx.expect(rows[0].element).toBe(rootTimegroup);
      ctx.expect(rows[1].element).toBe(video);
      ctx.expect(rows[2].element).toBe(nestedTimegroup);
      ctx.expect(rows[3].element).toBe(audio);
    },
    
    async "preserves depth information"(ctx) {
      const container = ctx.getContainer();
      
      const rootTimegroup = document.createElement("ef-timegroup");
      rootTimegroup.id = "root-tg-2";
      rootTimegroup.setAttribute("duration", "10s");
      
      const video = document.createElement("ef-video");
      video.id = "video-2";
      video.setAttribute("duration", "5s");
      
      const nestedTimegroup = document.createElement("ef-timegroup");
      nestedTimegroup.id = "nested-tg-2";
      nestedTimegroup.setAttribute("duration", "3s");
      
      const audio = document.createElement("ef-audio");
      audio.id = "audio-2";
      audio.setAttribute("duration", "2s");
      
      nestedTimegroup.appendChild(audio);
      rootTimegroup.appendChild(video);
      rootTimegroup.appendChild(nestedTimegroup);
      container.appendChild(rootTimegroup);
      
      await ctx.frame();
      
      const rows = flattenHierarchy(rootTimegroup as any);
      
      // Root should be depth 0
      ctx.expect(rows[0].depth).toBe(0);
      // Video (direct child) should be depth 1
      ctx.expect(rows[1].depth).toBe(1);
      // Nested timegroup should be depth 1
      ctx.expect(rows[2].depth).toBe(1);
      // Audio (child of nested) should be depth 2
      ctx.expect(rows[3].depth).toBe(2);
    },
    
    async "returns all elements for filtering later"(ctx) {
      const container = ctx.getContainer();
      
      const rootTimegroup = document.createElement("ef-timegroup");
      rootTimegroup.id = "root-tg-3";
      rootTimegroup.setAttribute("duration", "10s");
      
      const video = document.createElement("ef-video");
      video.id = "video-3";
      video.setAttribute("duration", "5s");
      video.className = "hide-me";
      
      const audio = document.createElement("ef-audio");
      audio.id = "audio-3";
      audio.setAttribute("duration", "2s");
      
      rootTimegroup.appendChild(video);
      rootTimegroup.appendChild(audio);
      container.appendChild(rootTimegroup);
      
      await ctx.frame();
      
      // flattenHierarchy returns all elements - filtering happens separately
      const rows = flattenHierarchy(rootTimegroup as any);
      
      // Should include all elements (filtering happens in EFTimeline.renderRows)
      ctx.expect(rows.length).toBe(3); // root + video + audio
      ctx.expect(rows.some(r => r.element === video)).toBe(true);
      ctx.expect(rows.some(r => r.element === audio)).toBe(true);
    },
    
    async "handles empty timegroup"(ctx) {
      const container = ctx.getContainer();
      
      const rootTimegroup = document.createElement("ef-timegroup");
      rootTimegroup.id = "root-tg-5";
      rootTimegroup.setAttribute("duration", "10s");
      
      container.appendChild(rootTimegroup);
      
      await ctx.frame();
      
      const rows = flattenHierarchy(rootTimegroup as any);
      
      // Should only have root timegroup
      ctx.expect(rows.length).toBe(1);
      ctx.expect(rows[0].element).toBe(rootTimegroup);
      ctx.expect(rows[0].depth).toBe(0);
    },
    
    async "handles deeply nested structures"(ctx) {
      const container = ctx.getContainer();
      
      const level1 = document.createElement("ef-timegroup");
      level1.id = "level1";
      level1.setAttribute("duration", "10s");
      
      const level2 = document.createElement("ef-timegroup");
      level2.id = "level2";
      level2.setAttribute("duration", "5s");
      
      const level3 = document.createElement("ef-timegroup");
      level3.id = "level3";
      level3.setAttribute("duration", "3s");
      
      const video = document.createElement("ef-video");
      video.id = "deep-video";
      video.setAttribute("duration", "2s");
      
      level3.appendChild(video);
      level2.appendChild(level3);
      level1.appendChild(level2);
      container.appendChild(level1);
      
      await ctx.frame();
      
      const rows = flattenHierarchy(level1 as any);
      
      // Should have all 4 elements
      ctx.expect(rows.length).toBe(4);
      ctx.expect(rows[0].depth).toBe(0); // level1
      ctx.expect(rows[1].depth).toBe(1); // level2
      ctx.expect(rows[2].depth).toBe(2); // level3
      ctx.expect(rows[3].depth).toBe(3); // video
    },
    
    async "handles mixed element types"(ctx) {
      const container = ctx.getContainer();
      
      const rootTimegroup = document.createElement("ef-timegroup");
      rootTimegroup.id = "root-tg-6";
      rootTimegroup.setAttribute("duration", "10s");
      
      const video = document.createElement("ef-video");
      video.id = "video-6";
      video.setAttribute("duration", "5s");
      
      const audio = document.createElement("ef-audio");
      audio.id = "audio-6";
      audio.setAttribute("duration", "3s");
      
      const image = document.createElement("ef-image");
      image.id = "image-6";
      image.setAttribute("duration", "2s");
      
      rootTimegroup.appendChild(video);
      rootTimegroup.appendChild(audio);
      rootTimegroup.appendChild(image);
      container.appendChild(rootTimegroup);
      
      await ctx.frame();
      
      const rows = flattenHierarchy(rootTimegroup as any);
      
      // Should have all 4 elements
      ctx.expect(rows.length).toBe(4);
      ctx.expect(rows[0].element).toBe(rootTimegroup);
      ctx.expect(rows[1].element).toBe(video);
      ctx.expect(rows[2].element).toBe(audio);
      ctx.expect(rows[3].element).toBe(image);
      
      // All should be depth 1
      ctx.expect(rows[1].depth).toBe(1);
      ctx.expect(rows[2].depth).toBe(1);
      ctx.expect(rows[3].depth).toBe(1);
    },
  },
});
