/**
 * THIS MODULE DOESNT USE THE DEBUG LOGGER BECAUSE IT IS
 * RUN IN A WEB BROWSER. LOGS ARE CAPTURED AND RE-LOGGED.
 *
 * A similar module exists in @/render. For the time being, we are
 * allowing this divergence to allow for a more efficient implementation
 * of the render info extraction.
 */

import type {
  EFCaptions,
  EFImage,
  EFMedia,
  EFTimegroup,
} from "@editframe/elements";
import { z } from "zod";

export const RenderInfo = z.object({
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

export const getRenderInfo = async () => {
  const rootTimeGroup = document.querySelector("ef-timegroup") as
    | EFTimegroup
    | undefined;
  if (!rootTimeGroup) {
    throw new Error("No ef-timegroup found");
  }

  console.error("Waiting for media durations", rootTimeGroup);
  await rootTimeGroup.waitForMediaDurations();

  const width = rootTimeGroup.clientWidth;
  const height = rootTimeGroup.clientHeight;
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
