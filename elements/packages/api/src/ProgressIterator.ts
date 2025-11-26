import type {
  CompleteEvent,
  ProgressEvent,
  StreamEventSource,
} from "./StreamEventSource.js";

const promiseWithResolvers = <T>() => {
  if (typeof Promise.withResolvers === "function") {
    return Promise.withResolvers<T>();
  }

  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: any) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

abstract class BaseEventIterator<
  T extends CompleteEvent | any,
> implements AsyncIterable<T> {
  protected eventSource: StreamEventSource;
  protected queue: T[] = [];
  protected index = 0;
  protected isComplete = false;
  protected resolversNext = promiseWithResolvers<void>();

  constructor(eventSource: StreamEventSource) {
    this.eventSource = eventSource;
  }

  async whenComplete() {
    for await (const _ of this) {
    }
    return this.queue;
  }

  declare on: (
    event: "progress",
    callback: (event: ProgressEvent) => void,
  ) => this;

  protected push(event: T) {
    this.queue.push(event);
    this.resolversNext.resolve();
    this.resolversNext = promiseWithResolvers<void>();
  }

  protected get queueLength() {
    return this.queue.length - this.index;
  }

  async *[Symbol.asyncIterator](): AsyncIterator<T> {
    try {
      while (!this.isComplete || this.queueLength > 0) {
        if (this.queueLength === 0) {
          await this.resolversNext.promise;
        } else {
          const item = this.queue[this.index];
          if (!item) {
            throw new Error("Queue is corrupted");
          }
          this.index++;
          yield item;
        }
      }
    } finally {
      this.eventSource.close();
    }
  }
}

// Progress-only iterator
export class ProgressIterator extends BaseEventIterator<
  ProgressEvent | CompleteEvent
> {
  constructor(eventSource: StreamEventSource) {
    super(eventSource);
    this.initializeListeners();
  }

  private initializeListeners() {
    this.eventSource.on("progress", (event) => {
      this.push(event);
    });

    this.eventSource.on("complete", (event) => {
      this.isComplete = true;
      this.push(event);
    });

    this.eventSource.on("error", (error) => {
      this.eventSource.close();
      this.resolversNext.reject(error);
    });
  }
}

// Size and Completion iterator
export class CompletionIterator extends BaseEventIterator<
  CompleteEvent | ProgressEvent
> {
  private totalSize = 0;
  private currentProgress = 0;

  constructor(eventSource: StreamEventSource) {
    super(eventSource);
    this.initializeListeners();
  }

  private initializeListeners() {
    this.eventSource.on("size", (event) => {
      this.totalSize = event.data.size;
      this.push({
        type: "progress",
        data: {
          progress: 0,
        },
      });
    });

    this.eventSource.on("completion", (event) => {
      this.currentProgress += Number(event.data.count);

      this.push({
        type: "progress",
        data: {
          progress: this.currentProgress / this.totalSize,
        },
      });

      if (this.currentProgress >= this.totalSize) {
        this.isComplete = true;
      }
    });

    this.eventSource.on("complete", (event) => {
      this.isComplete = true;
      this.push(event);
    });

    this.eventSource.on("error", (error) => {
      this.eventSource.close();
      this.resolversNext.reject(error);
    });
  }

  abort() {
    this.eventSource.abort();
  }
}
