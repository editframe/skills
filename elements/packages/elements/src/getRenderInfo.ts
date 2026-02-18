/**
 * THIS MODULE DOESNT USE THE DEBUG LOGGER BECAUSE IT IS
 * RUN IN A WEB BROWSER. LOGS ARE CAPTURED AND RE-LOGGED.
 *
 * A similar module exists in @/render. For the time being, we are
 * allowing this divergence to allow for a more efficient implementation
 * of the render info extraction.
 */

// Import types directly from source files to avoid circular dependency through index.ts
import type { EFTimegroup } from "./elements/EFTimegroup.js";
import type { EFMedia } from "./elements/EFMedia.js";
import type { EFCaptions } from "./elements/EFCaptions.js";
import type { EFImage } from "./elements/EFImage.js";
import { z } from "zod";

export const RenderInfoSchema = z.object({
  width: z.number().positive(),
  height: z.number().positive(),
  fps: z.number().positive(),
  durationMs: z.number().positive(),
  assets: z.object({
    efMedia: z.record(z.any()),
    efCaptions: z.array(z.string()),
    efImage: z.array(z.string()),
  }),
});

export type RenderInfo = z.infer<typeof RenderInfoSchema>;

export const getRenderInfo = async () => {
  const rootTimeGroup = document.querySelector("ef-timegroup") as
    | EFTimegroup
    | undefined;
  if (!rootTimeGroup) {
    throw new Error("No ef-timegroup found");
  }

  console.error("Waiting for media durations", rootTimeGroup);
  await rootTimeGroup.waitForMediaDurations();

  let width = rootTimeGroup.clientWidth;
  let height = rootTimeGroup.clientHeight;

  // Fallback for headless browsers where clientWidth/Height can be 0
  if (!width || !height) {
    const rect = rootTimeGroup.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      width = rect.width;
      height = rect.height;
    }
  }
  if (!width || !height) {
    const computed = getComputedStyle(rootTimeGroup);
    const cw = parseFloat(computed.width);
    const ch = parseFloat(computed.height);
    if (cw > 0 && ch > 0) {
      width = cw;
      height = ch;
    }
  }
  const fps = 30;
  const durationMs = Math.round(rootTimeGroup.durationMs);

  const elements = document.querySelectorAll(
    "ef-audio, ef-video, ef-image, ef-captions",
  );

  const assets = {
    efMedia: <Record<string, any>>{},
    efCaptions: new Set<string>(),
    efImage: new Set<string>(),
  };

  for (const element of elements) {
    switch (element.tagName) {
      case "EF-AUDIO":
      case "EF-VIDEO": {
        const src = (element as EFMedia).src;
        console.error("Processing element", element.tagName, src);
        // Access fragment index data from the media engine task
        const mediaEngine = (element as EFMedia).mediaEngineTask.value;
        if (mediaEngine && "data" in mediaEngine) {
          assets.efMedia[src] = (mediaEngine as any).data;
        }
        break;
      }
      case "EF-IMAGE": {
        const src = (element as EFImage).src;
        console.error("Processing element", element.tagName, src);
        assets.efImage.add(src);
        break;
      }
      case "EF-CAPTIONS": {
        const src = (element as EFCaptions).targetElement?.src;
        console.error("Processing element", element.tagName, src);
        assets.efCaptions.add(src ?? "undefined");
        break;
      }
    }
  }

  const renderInfo = {
    width,
    height,
    fps,
    durationMs,
    assets: {
      efMedia: assets.efMedia,
      efCaptions: Array.from(assets.efCaptions),
      efImage: Array.from(assets.efImage),
    },
  };

  console.error("Render info", renderInfo);

  return renderInfo;
};
