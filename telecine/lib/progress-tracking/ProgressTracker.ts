import { logger } from "@/logging";
import { valkey } from "@/valkey/valkey";

// Add the new error class at the top of the file
export class ProgressTrackerTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Progress tracker timed out after ${timeoutMs}ms of inactivity`);
    this.name = "ProgressTrackerTimeoutError";
  }
}

// Add the new error class alongside the existing ProgressTrackerTimeoutError
export class ProgressTrackerFailureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProgressTrackerFailureError";
  }
}

// Base interface for common fields
interface BaseProgressItem {
  id: string;
  type: string;
  [key: string]: string | number; // Allow for additional fields
}

interface HeartbeatUpdate extends BaseProgressItem {
  type: "heartbeat";
  timestamp: number;
}

// Size type
interface SizeUpdate extends BaseProgressItem {
  type: "size";
  size: number;
}

// Completion type
interface CompletionUpdate extends BaseProgressItem {
  type: "completion";
  count: number;
}

// Progress type
interface ProgressUpdate extends BaseProgressItem {
  type: "progress";
  progress: number;
}

// Failure type
interface FailureUpdate extends BaseProgressItem {
  type: "failure";
  message: string;
}

// Combined union type
export type ProgressItem =
  | HeartbeatUpdate
  | SizeUpdate
  | CompletionUpdate
  | ProgressUpdate
  | FailureUpdate;

export class ProgressTracker {
  private readClient?: typeof valkey;
  private lastWrittenProgress?: number;

  constructor(
    private readonly key: string,
    private readonly maxlen = 10_000,
    private readonly blockMs = 1000,
  ) {}

  private parseEntries(id: string, entries: string[]): ProgressItem {
    const entryObject: Partial<ProgressItem> = {
      id,
    };
    for (let i = 0; i < entries.length; i += 2) {
      const entryKey = entries[i];
      const entryValue = entries[i + 1];
      if (entryKey && entryValue) {
        entryObject[entryKey] =
          entryKey === "progress" ? Number.parseFloat(entryValue) : entryValue;
      } else {
        throw new Error(`Invalid entry: ${entryKey} ${entryValue}`);
      }
    }
    return entryObject as ProgressItem;
  }

  async *iterator(timeoutMs = 30_000): AsyncGenerator<ProgressItem> {
    // Create the client if it doesn't exist
    this.readClient = valkey.duplicate();
    // Start from the beginning of the stream instead of just new messages
    let lastId = "0";
    let lastUpdateTime = Date.now();

    let totalSize: number | undefined;
    let totalCompletions = 0;

    logger.info(`"Starting progress tracker ${this.key}`);
    try {
      while (true) {
        // biome-ignore format: keep this on one line
        logger.info(
          `Reading progress updates for: ${this.key} lastId: ${lastId}`,
        );
        const result = await this.readClient.xread(
          "BLOCK",
          this.blockMs,
          "STREAMS",
          this.key,
          lastId,
        );

        if (result) {
          // @ts-expect-error Not sure why this doesn't like destructuring, but its fine.
          const [, items] = result[0];
          if (items.length > 0) {
            // Reset timeout when we receive updates
            lastUpdateTime = Date.now();

            // Iterate through all items instead of just the last one
            for (const [id, entries] of items) {
              const item = this.parseEntries(id, entries);

              if (item.type === "failure") {
                throw new ProgressTrackerFailureError(item.message);
              }

              if (item.type === "size") {
                totalSize = item.size;
                yield item;
              } else if (item.type === "completion") {
                totalCompletions += item.count;
                yield item;
                // Return if we've reached or exceeded the total size
                if (totalSize && totalCompletions >= totalSize) {
                  return;
                }
              }

              if (item.type === "heartbeat") {
                yield item;
              }

              if (typeof item.progress === "number") {
                yield item;
              }

              if (typeof item.progress === "number" && item.progress >= 1) {
                return;
              }

              lastId = id;
            }
          }
        }

        if (Date.now() - lastUpdateTime > timeoutMs) {
          throw new ProgressTrackerTimeoutError(timeoutMs);
        }
      }
    } finally {
      // Clean up the client
      if (this.readClient) {
        await this.readClient.quit();
        this.readClient = undefined;
      }
    }
  }

  async whenCompleted(): Promise<void> {
    for await (const _item of this.iterator()) {
    }
  }

  async getLastItem(): Promise<ProgressItem | undefined> {
    const [lastItem] = await valkey.xrevrange(this.key, "+", "-", "COUNT", "1");
    if (!lastItem) {
      return;
    }
    const [id, entries] = lastItem;
    return this.parseEntries(id, entries);
  }

  async getAllItems(): Promise<ProgressItem[]> {
    // biome-ignore format: keep this on one line
    const items = await valkey.xrange(
      this.key,
      "-",
      "+",
      "COUNT",
      this.maxlen.toString(),
    );
    return items.map(([id, entries]) => this.parseEntries(id, entries));
  }

  async writeSize(size: number) {
    // biome-ignore format: keep this on one line
    await valkey
      .multi()
      .xadd(
        this.key,
        "MAXLEN",
        "~",
        this.maxlen.toString(),
        "*",
        "type",
        "size",
        "size",
        size.toString(),
      )
      .expire(this.key, 1000, "GT")
      .exec();
  }

  async incrementCompletion(count: number) {
    // biome-ignore format: keep this on one line
    await valkey
      .multi()
      .xadd(
        this.key,
        "MAXLEN",
        "~",
        this.maxlen.toString(),
        "*",
        "type",
        "completion",
        "count",
        count.toString(),
      )
      .expire(this.key, 1000, "GT")
      .exec();
  }

  async writeProgress(progress: number) {
    // Round progress to two decimal places
    // This prevents writing too many progress updates to the stream
    const roundedProgress = Math.round(progress * 100) / 100;

    // Only write if this is a new progress value (different when rounded)
    if (
      this.lastWrittenProgress === undefined ||
      roundedProgress !== this.lastWrittenProgress
    ) {
      this.lastWrittenProgress = roundedProgress;

      // biome-ignore format: keep this on one line
      await valkey
        .multi()
        .xadd(
          this.key,
          "MAXLEN",
          "~",
          this.maxlen.toString(),
          "*",
          "type",
          "progress",
          "progress",
          roundedProgress.toString(),
        )
        .expire(this.key, 1000, "GT")
        .exec();
    }
  }

  async writeFailure(message: string) {
    // biome-ignore format: keep this on one line
    await valkey
      .multi()
      .xadd(
        this.key,
        "MAXLEN",
        "~",
        this.maxlen.toString(),
        "*",
        "type",
        "failure",
        "message",
        message,
      )
      .expire(this.key, 1000, "GT")
      .exec();
  }

  async clear() {
    await valkey.del(this.key);
  }

  // Add a cleanup method
  async cleanup() {
    if (this.readClient) {
      await this.readClient.quit();
      this.readClient = undefined;
    }
  }

  async writeHeartbeat() {
    await valkey
      .multi()
      .xadd(
        this.key,
        "MAXLEN",
        "~",
        this.maxlen.toString(),
        "*",
        "type",
        "heartbeat",
        "timestamp",
        Date.now().toString(),
      )
      .expire(this.key, 1000, "GT")
      .exec();
  }

  private heartbeatInterval?: NodeJS.Timeout;
  private heartbeatIntervalMs = 10_000;

  startHeartbeat() {
    if (this.heartbeatInterval) {
      throw new Error("Heartbeat already started");
    }
    this.heartbeatInterval = setInterval(async () => {
      await this.writeHeartbeat();
    }, this.heartbeatIntervalMs);
  }

  stopHeartbeat() {
    if (!this.heartbeatInterval) {
      throw new Error("Heartbeat not started");
    }
    clearInterval(this.heartbeatInterval);
    this.heartbeatInterval = undefined;
  }
}

export class TestProgressTracker extends ProgressTracker {
  constructor() {
    super("test", 10_000, 1000);
  }

  async writeProgress() {}
}
