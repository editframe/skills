import { FetchContext } from "../../../av/src/EncodedAsset";
import type { ReadableStream as ReadableStreamNode } from "node:stream/web";

export type AnyReadableStream =
  | ReadableStream<Uint8Array>
  | ReadableStreamNode<Uint8Array>;

export interface StorageProvider {
  createFromReadableStream(
    id: string,
    stream: ReadableStream | ReadableStreamNode,
  ): Promise<void>;
  createFromBufferList(id: string, bufferList: ArrayBuffer[]): Promise<void>;
  fileFromId(id: string): Promise<File>;
  readableStreamFromId(id: string): Promise<AnyReadableStream>;
  readableStreamFromURL(
    id: string,
    url: string,
    fetchContext?: FetchContext,
  ): Promise<AnyReadableStream>;
}
