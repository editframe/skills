import { EventEmitter } from "node:events";
import { createParser } from "eventsource-parser";

export class StreamEventSource extends EventEmitter {
  private reader: ReadableStreamDefaultReader<Uint8Array>;
  private decoder = new TextDecoder();
  private parser;

  constructor(stream: ReadableStream) {
    super();
    if (!stream) {
      console.error("StreamEventSource: Stream is null or undefined");
      throw new Error("Stream is required");
    }
    if (!stream.getReader) {
      console.error(
        "StreamEventSource: Stream is not a ReadableStream",
        stream,
      );
      throw new Error("Invalid stream object");
    }

    this.reader = stream.getReader();

    // Create parser instance
    this.parser = createParser({
      onError: (err) => {
        console.error("StreamEventSource: Parser error:", err);
        this.emit("error", err);
      },
      onEvent: (event) => {
        if (event.event) {
          this.emit(event.event, event.data);
        } else {
          this.emit("message", {
            id: event.id,
            data: event.data,
          });
        }
      },
    });

    this.startReading().catch((error) => {
      console.error("StreamEventSource: Error in startReading:", error);
      this.emit("error", error);
    });
  }

  whenClosed() {
    return new Promise<void>((resolve) => {
      this.on("end", resolve);
    });
  }

  private async startReading() {
    try {
      while (true) {
        const { done, value } = await this.reader.read();
        if (done) break;

        const chunk = this.decoder.decode(value);
        this.parser.feed(chunk);
      }
      this.close();
      this.emit("end");
    } catch (error) {
      console.error("StreamEventSource: Error reading stream:", error);
      this.emit("error", error);
    }
  }

  close() {
    this.reader.cancel();
    this.parser.reset();
  }
}
