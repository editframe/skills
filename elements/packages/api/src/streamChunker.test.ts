import { expect, test } from "vitest";

import { webReadableFromBuffers } from "./readableFromBuffers.js";
import { streamChunker } from "./streamChunker.js";

test("chunks stream into buffers of specified size", async () => {
  const readableStream = webReadableFromBuffers(Buffer.from("hello"), Buffer.from("world"));

  const chunks = [];
  for await (const chunk of streamChunker(readableStream, 5)) {
    chunks.push(chunk);
  }

  expect(chunks).toEqual([
    new Uint8Array(Buffer.from("hello")),
    new Uint8Array(Buffer.from("world")),
  ]);
});

test("yields remaining buffer if less than chunk size", async () => {
  const readableStream = webReadableFromBuffers(Buffer.from("nice"));

  const chunks = [];
  for await (const chunk of streamChunker(readableStream, 5)) {
    chunks.push(chunk);
  }

  expect(chunks).toEqual([new Uint8Array(Buffer.from("nice"))]);
});

test("handles Uint8Array input from browser streams", async () => {
  const readableStream = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(Buffer.from("hello")));
      controller.enqueue(new Uint8Array(Buffer.from("world")));
      controller.close();
    },
  });

  const chunks = [];
  for await (const chunk of streamChunker(readableStream, 5)) {
    chunks.push(chunk);
  }

  expect(chunks).toEqual([
    new Uint8Array(Buffer.from("hello")),
    new Uint8Array(Buffer.from("world")),
  ]);
});
