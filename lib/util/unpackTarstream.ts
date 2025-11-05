import type { Readable } from "node:stream";

export const unpackTarstream = async (
  stream: Readable,
  destination: string,
) => {
  const tar = await import("tar");
  return new Promise<void>((resolve, reject) => {
    const extractor = tar.extract({
      cwd: destination,
    });

    stream.pipe(extractor);

    stream.once("error", reject);
    extractor.once("error", reject);
    extractor.once("finish", resolve);
  });
};
