import { cacheImage, findOrCreateCaptions, generateTrack } from "@editframe/assets";
import type { getRenderInfo } from "@editframe/elements/node";

export const processRenderInfo = async (renderInfo: Awaited<ReturnType<typeof getRenderInfo>>) => {
  for (const [src, tracks] of Object.entries(renderInfo.assets.efMedia)) {
    process.stderr.write("Processing media asset: ");
    process.stderr.write(src);
    process.stderr.write("\n");
    for (const trackId in tracks) {
      process.stderr.write("Generating track: ");
      process.stderr.write(trackId);
      process.stderr.write("\n");
      await generateTrack("./src/assets", `./src${src}`, `src?trackId=${trackId}`);
    }
  }

  for (const imageAsset of renderInfo.assets.efImage) {
    process.stderr.write("Processing image asset: ");
    process.stderr.write(imageAsset);
    process.stderr.write("\n");
    await cacheImage("./src/assets", `./src${imageAsset}`);
  }

  for (const captionsAsset of renderInfo.assets.efCaptions) {
    process.stderr.write("Processing captions asset: ");
    process.stderr.write(captionsAsset);
    process.stderr.write("\n");
    await findOrCreateCaptions("./src/assets", `./src${captionsAsset}`);
  }
};
