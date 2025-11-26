import type { Redis as ValKey } from "iovalkey";
import SuperJSON from "superjson";

import type { LifecycleMessage } from "./Producer";
import { abortableLoopWithBackoff } from "../AbortableLoop";
import { logger } from "@/logging";

type ReadResult = [string, [string, string[]][]][];

interface ConsumerArgs {
  storage: ValKey;
  consumerId: string;
  batchSize: number;
  blockTimeMs: number;
  streamKey: string;
}

interface Message {
  id: string;
  data: LifecycleMessage;
}

export class Consumer {
  storage: ValKey;
  isRunning = true;
  streamKey: string;
  consumerId: string;
  groupName: string;
  batchSize: number;
  blockTime: number;

  static async create(args: ConsumerArgs) {
    const consumer = new Consumer(args);
    await consumer.initialize();
    return consumer;
  }

  constructor(args: ConsumerArgs) {
    this.storage = args.storage;
    this.streamKey = args.streamKey;
    this.groupName = "default";
    this.consumerId = args.consumerId;
    this.batchSize = args.batchSize;
    this.blockTime = args.blockTimeMs;
  }

  async readNewMessages() {
    // biome-ignore format: control over line size
    return this.parseMessages(
      (await this.storage.xreadgroup(
        "GROUP",
        this.groupName,
        this.consumerId,
        "COUNT",
        this.batchSize,
        "BLOCK",
        this.blockTime,
        "STREAMS",
        this.streamKey,
        ">",
      )) as ReadResult | null,
    );
  }

  parseMessages(messageGroups: ReadResult | null): Record<string, Message[]> {
    if (!messageGroups) return {};
    const messagesByStream: Record<string, Message[]> = {};
    for (const [streamKey, messages] of messageGroups) {
      messagesByStream[streamKey] = messages.map(([messageId, fields]) => {
        const data: Record<string, string> = {};
        for (let i = 0; i < fields.length; i += 2) {
          if (fields[i] === "details") {
            data[fields[i]!] = SuperJSON.parse(fields[i + 1]!);
          } else {
            data[fields[i]!] = fields[i + 1]!;
          }
        }
        return {
          id: messageId,
          data: data as unknown as LifecycleMessage,
        };
      });
    }
    return messagesByStream;
  }

  async consume(fn: (messages: Message[]) => Promise<void>) {
    abortableLoopWithBackoff({
      spanName: `consume:${this.streamKey}`,
      fn: () => this.processMessages(fn),
      backoffMs: 250,
      alwaysSleep: true,
    });
  }

  async initialize() {
    try {
      await this.storage.xgroup(
        "CREATE",
        this.streamKey,
        this.groupName,
        "$",
        "MKSTREAM",
      );
    } catch (error) {
      if (error instanceof Error && error.message.includes("BUSYGROUP")) {
        // Group already exists
      } else {
        throw error;
      }
    }
  }

  getPendingMessages() {
    return this.storage.xpending(
      this.streamKey,
      this.groupName,
      "-",
      "+", // ID range (all)
      this.batchSize,
    );
  }

  async claimPendingMessages(idleTimeMs = 30_000) {
    const [_cursor, claimed, _deleted] = await this.storage.xautoclaim(
      this.streamKey,
      this.groupName,
      this.consumerId,
      idleTimeMs, // Min idle time in milliseconds
      "0-0", // Start with the first possible ID
      "COUNT",
      this.batchSize,
    );
    // Return parsed messages directly
    // @ts-ignore don't want to figure out the types right now
    const parsedMessages = claimed.map(([id, fields]) => {
      const data: Record<string, string> = {};
      for (let i = 0; i < fields.length; i += 2) {
        const key = fields[i];
        const value = fields[i + 1];
        if (key && value) {
          data[key] = value;
        }
      }
      return { id, data };
    });

    return parsedMessages;
  }

  async acknowledgeMessages(messages: Message[]) {
    if (messages.length === 0) return;
    logger.info({ count: messages.length }, "Acknowledging messages");
    await this.storage.xack(
      this.streamKey,
      this.groupName,
      ...messages.map((m) => m.id),
    );
  }

  async processMessages(fn: (messages: Message[]) => Promise<void>) {
    const messages = [
      ...(await this.claimPendingMessages()),
      ...Object.values(await this.readNewMessages()).flat(),
    ];
    if (messages.length > 0) {
      logger.info({ count: messages.length }, "Processing messages");
    }
    try {
      await fn(messages);
      await this.acknowledgeMessages(messages);
    } finally {
    }
  }
}
