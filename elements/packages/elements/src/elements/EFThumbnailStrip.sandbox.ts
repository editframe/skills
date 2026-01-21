import "./EFThumbnailStrip.js";
import "./EFTimegroup.js";
import "./EFVideo.js";

import { defineSandbox } from "../sandbox/index.js";
import { html } from "lit";

import { thumbnailImageCache } from "./EFThumbnailStrip.js";

// Test video URL - use local asset for tests
const TEST_VIDEO_SRC = "/assets/bars-n-tone2.mp4";



export default defineSandbox({
  name: "EFThumbnailStrip",
  description: "Canvas-based thumbnail strip for ef-video and ef-timegroup elements",
  category: "gui",
  subcategory: "preview",
  
  render: () => html``,

  setup: async () => {
    await thumbnailImageCache.clear();
  },
  
  scenarios: {
    // ============================================
    // DEMONSTRATION - Visual examples
    // ============================================
    
    "renders thumbnails from video content": {
      category: "demonstration",
      description: "Shows thumbnail strip rendering from a timegroup",
      render: () => html`
        <ef-video id="thumbs-for-video" class="w-[200px]" src=${TEST_VIDEO_SRC}></ef-video>
      `,
      async run(ctx) {
       
      },
    },
    
   
  },
});
