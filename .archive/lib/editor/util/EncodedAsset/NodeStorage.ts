import { FetchContext } from "../../../av/src/EncodedAsset";
import { StorageProvider } from "./StorageProvider";
import type { ReadableStream } from "node:stream/web";

export const NodeStorage: StorageProvider = {
  async createFromBufferList(id: string, bufferList: ArrayBuffer[]) {
    const fs = await import("fs/promises");
    const path = await import("path");
    const fileHandle = await fs.open(
      path.join(process.cwd(), "data", "local", id),
      "w",
    );
    for (const buffer of bufferList) {
      await fileHandle.write(new Uint8Array(buffer));
    }
    await fileHandle.close();
  },

  async createFromReadableStream(id: string, stream: ReadableStream) {
    const fs = await import("fs");
    const path = await import("path");
    const writeStream = fs.createWriteStream(
      path.join(process.cwd(), "data", "local", id),
    );
    await stream
      .getReader()
      .read()
      .then(async function write({ done, value }) {
        if (done) {
          writeStream.end();
          return;
        }
        writeStream.write(value);
        stream.getReader().read().then(write);
      });
  },

  async readableStreamFromId(id: string): Promise<ReadableStream<Uint8Array>> {
    try {
      const fs = await import("fs");
      const path = await import("path");
      const { ReadableStream } = await import("stream/web");
      const stream = fs.createReadStream(
        path.join(process.cwd(), "data", "local", id),
        "binary",
      );
      return ReadableStream.from<Uint8Array>(stream);
    } catch (error) {
      console.error("Error creating asset from id", error);
      throw error;
    }
  },

  async readableStreamFromURL(
    _id: string,
    _url: string,
    _fetchContext?: FetchContext,
  ): Promise<ReadableStream<Uint8Array>> {
    throw new Error("Unimplemented fromURL in NodeStorage");
  },
};
