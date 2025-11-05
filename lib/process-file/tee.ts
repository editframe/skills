import type { Readable } from "node:stream";

// Function to split a readable stream into two readable streams
export const tee = async (source: Readable): Promise<[Readable, Readable]> => {
  const { PassThrough } = await import("node:stream");

  const stream1 = new PassThrough();
  const stream2 = new PassThrough();

  source.on("data", (chunk) => {
    stream1.write(chunk);
    stream2.write(chunk);
  });

  source.on("end", () => {
    stream1.end();
    stream2.end();
  });

  source.on("error", (err) => {
    stream1.destroy(err);
    stream2.destroy(err);
  });

  return [stream1, stream2];
};
