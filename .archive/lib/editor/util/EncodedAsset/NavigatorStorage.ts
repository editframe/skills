import { StorageProvider } from "./StorageProvider";
import {
  AssetNotAvailableLocally,
  FetchContext,
} from "../../../av/src/EncodedAsset";

export const NavigatorStorage: StorageProvider = {
  async createFromBufferList(id: string, bufferList: ArrayBuffer[]) {
    console.log("BufferList", bufferList);
    const fsHandle = await navigator.storage.getDirectory();
    const fileHandle = await fsHandle.getFileHandle(id, {
      create: true,
    });
    const writable = await fileHandle.createWritable();
    for (const buffer of bufferList) {
      await writable.write(buffer);
    }
    await writable.close();
  },

  async fileFromId(id: string): Promise<File> {
    const fsHandle = await navigator.storage.getDirectory();
    const fileHandle = await fsHandle.getFileHandle(id, {
      create: true,
    });
    return fileHandle.getFile();
  },

  async createFromReadableStream(id: string, stream: ReadableStream) {
    const fsHandle = await navigator.storage.getDirectory();
    const fileHandle = await fsHandle.getFileHandle(id, {
      create: true,
    });
    const writable = await fileHandle.createWritable();
    const writer = writable.getWriter();
    const reader = stream.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      await writer.write(value);
    }
    await writer.close();
  },

  async readableStreamFromId(id: string): Promise<ReadableStream<Uint8Array>> {
    try {
      const fileReadable = await this.fileFromId(id);
      return fileReadable.stream();
    } catch (error) {
      console.error(`Error creating asset from id`, error);
      if (error instanceof DOMException && error.name === "NotFoundError") {
        throw new AssetNotAvailableLocally();
      } else {
        throw error;
      }
    }
  },

  async readableStreamFromURL(
    id: string,
    url: string,
    fetchContext?: FetchContext,
  ): Promise<ReadableStream<Uint8Array>> {
    const fsHandle = await navigator.storage.getDirectory();
    const fileHandle = await fsHandle.getFileHandle(id, {
      create: true,
    });
    const fileReadable = await fileHandle.getFile();
    if (fileReadable.size === 0) {
      const fileWritable = await fileHandle.createWritable({
        keepExistingData: false,
      });

      // Fetch context is only set in the rendering backend
      // It's responsibility is to provide authentication headers
      // as well as a base URL for the fetch.
      // nota bene: This is not my favorite design, but I didn't realize the authentication
      // requirement until late in the project.
      const urlToFetch = fetchContext ? fetchContext.origin + url : url;
      const fetchConfig = fetchContext ? fetchContext.fetchConfig : undefined;

      const response = await fetch(urlToFetch, fetchConfig);

      console.log(
        "NavigatorStorage.fromURL",
        urlToFetch,
        response.status,
        response.ok,
      );

      if (response.ok && response.status < 300 && response.body) {
        await response.body.pipeTo(fileWritable);
      } else {
        throw new Error("Failed to fetch . " + (await response.text()));
      }
    }
    return fileReadable.stream();
  },
};
