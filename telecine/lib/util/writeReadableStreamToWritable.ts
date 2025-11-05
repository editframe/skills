import type { Writable } from "node:stream";

export async function writeReadableStreamToWritable(
  stream: ReadableStream,
  writable: Writable,
) {
  const reader = stream.getReader();
  const flushable = writable as { flush?: Function };
  let byteSize = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (value) {
        byteSize += value.byteLength;
      }

      if (done) {
        writable.end();
        break;
      }

      writable.write(value);
      if (typeof flushable.flush === "function") {
        flushable.flush();
      }
    }
    return byteSize;
  } catch (error: unknown) {
    writable.destroy(error as Error);
    throw error;
  }
}
