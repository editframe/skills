import debug from "debug";
import { createParser } from "eventsource-parser";

const log = debug("ef:StreamEventSource");

export type EventCallback<T> = (event: T) => void;
export type StreamEventSourceEventMap = {
  progress: ProgressEvent;
  complete: CompleteEvent;
  size: SizeEvent;
  completion: CompletionEvent;
  heartbeat: HeartbeatEvent;
  message: {
    id: string | undefined;
    data: string;
  };
  end: Array<unknown>;
  error: Error;
};

export type ProgressEvent = {
  type: "progress";
  data: {
    /** Progress events are sent as a percentage of the total render time.
     * This is a number between 0 and 1.
     */
    progress: number;
  };
};
export type CompleteEvent = { type: "complete"; data: object };
export type SizeEvent = { type: "size"; data: { size: number } };
export type CompletionEvent = { type: "completion"; data: { count: number } };
export type HeartbeatEvent = { type: "heartbeat"; data: { timestamp: string } };

export class StreamEventSource {
  private stream: ReadableStream;
  private activeReader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private decoder = new TextDecoder();
  private parser;
  private listeners: {
    [K in keyof StreamEventSourceEventMap]?: EventCallback<
      StreamEventSourceEventMap[K]
    >[];
  } = {};
  private abortController: AbortController;
  constructor(stream: ReadableStream, abortController: AbortController) {
    if (!stream) {
      console.error("StreamEventSource: Stream is null or undefined");
      throw new Error("Stream is required");
    }
    this.stream = stream;
    this.abortController = abortController;

    // Create parser instance
    this.parser = createParser({
      onError: (err) => {
        console.error("StreamEventSource: Parser error:", err);
        this.emit("error", err);
      },
      onEvent: (event) => {
        if (event.event) {
          switch (event.event) {
            case "heartbeat":
              this.emit("heartbeat", {
                type: "heartbeat",
                data: JSON.parse(event.data),
              });
              break;
            case "size":
              this.emit("size", {
                type: "size",
                data: JSON.parse(event.data),
              });
              break;
            case "completion":
              this.emit("completion", {
                type: "completion",
                data: JSON.parse(event.data),
              });
              break;
            case "progress":
              this.emit("progress", {
                type: "progress",
                data: JSON.parse(event.data),
              });
              break;
            case "complete":
              this.emit("complete", {
                type: "complete",
                data: JSON.parse(event.data),
              });
              break;
            case "error":
              log("StreamEventSource: Error event", event.data);
              this.emit("error", new Error(event.data));
              break;
            default:
              this.emit(
                "error",
                new Error(`Unknown event: ${event.event} data: ${event.data}`),
              );
          }
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

    this.abortController.signal.addEventListener("abort", () => {
      this.close();
    });
  }

  on<K extends keyof StreamEventSourceEventMap>(
    event: K,
    callback: EventCallback<StreamEventSourceEventMap[K]>,
  ) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event]?.push(callback);
    return this;
  }

  off<K extends keyof StreamEventSourceEventMap>(
    event: K,
    callback: EventCallback<StreamEventSourceEventMap[K]>,
  ) {
    const listeners = this.listeners[event];
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
    return this;
  }

  protected emit<K extends keyof StreamEventSourceEventMap>(
    event: K,
    data: StreamEventSourceEventMap[K],
  ) {
    for (const callback of this.listeners[event] ?? []) {
      callback(data);
    }
  }

  whenClosed() {
    return new Promise<void>((resolve) => {
      this.on("end", () => resolve());
    });
  }

  private async startReading() {
    try {
      this.activeReader = this.stream.getReader();
      while (true) {
        const { done, value } = await this.activeReader.read();
        if (done) break;

        const chunk = this.decoder.decode(value);
        if (!value) {
          throw new Error("Chunk is null");
        }
        this.parser.feed(chunk);
      }
      this.activeReader = null;
      this.emit("end", []);
    } catch (error) {
      console.error("StreamEventSource: Error reading stream:", error);
      if (error instanceof Error) {
        this.emit("error", error);
      } else {
        this.emit("error", new Error(String(error)));
      }
    }
  }

  close() {
    if (this.activeReader) {
      this.activeReader = null;
    }
    this.parser.reset();
  }

  abort() {
    this.abortController.abort();
  }
}
