import superjson from "superjson";
import { WebSocket } from "ws";

import { makeLogger } from "@/logging";
import { promiseWithResolvers } from "@/util/promiseWithResolvers";
import { sleep } from "@/util/sleep";
import { raceTimeout } from "@/util/raceTimeout";
import {
  DISCONNECT_TIMEOUT_MS,
  type Connection,
  type ConnectionConstructorArgs,
} from "./Scheduler";
import type { Queue } from "./Queue";
import { inspect } from "node:util";

export const ConnectionURLMap = new Map<Queue<unknown>, string>();

export class WorkerConnection implements Connection {
  logger: ReturnType<typeof makeLogger>;
  _ws?: WebSocket;
  url: string;
  id = crypto.randomUUID();
  queue: Queue<unknown>;
  onHangup: () => void;
  onPong: () => void;

  connectionResolvers = promiseWithResolvers<void>();
  disconnectResolvers = promiseWithResolvers<void>();
  whenConnected = this.connectionResolvers.promise;
  whenDisconnected = this.disconnectResolvers.promise;

  constructor(args: ConnectionConstructorArgs) {
    this.logger = makeLogger().child({
      queue: args.queue.name,
      component: "WorkerConnection",
    });
    // In production we get worker http uris, so we'll convert them to ws
    const url = ConnectionURLMap.get(args.queue)?.replace(/^http/, "ws");
    if (!url) {
      throw new Error(
        `WorkerConnection for queue ${args.queue.name} has no URL`,
      );
    }
    this.url = url;
    this.queue = args.queue;
    this.onHangup = args.onHangup;
    this.onPong = args.onPong;
  }

  get ws() {
    if (!this._ws) {
      throw new Error(
        "WorkerConnection not connected while attempting to access WebSocket",
      );
    }
    return this._ws;
  }

  connect() {
    this.logger.info({ url: this.url }, "Connecting to worker");
    this._ws = new WebSocket(this.url);
    this.ws.on("pong", () => {
      this.onPong();
    });
    this.ws.on("close", () => {
      this.logger.info("WorkerConnection closed");
      this.onHangup();
    });
    this.ws.on("error", (error) => {
      error.message;
      this.logger.error({ error: inspect(error) }, "WorkerConnection error");
      this.onHangup();
    });
    this.ws.on("open", () => {
      this.logger.info("WorkerConnection opened");
      this.connectionResolvers.resolve();
    });
    return this.connectionResolvers.promise;
  }

  terminate() {
    // This is a no-op if the WebSocket is not connected
    if (this._ws) {
      if (this._ws.readyState < WebSocket.CLOSED) {
        this._ws.close();
      }
      // No longer forward pongshangups to the state machine
    }
    this.onPong = () => { };
    this.onHangup = () => { };
    return Promise.resolve();
  }

  async disconnect() {
    if (this.ws.readyState === WebSocket.OPEN) {
      await Promise.race([
        sleep(DISCONNECT_TIMEOUT_MS),
        new Promise<void>((resolve, reject) => {
          this.ws.once("close", () => {
            resolve();
          });
          this.ws.once("error", (error) => {
            reject(error);
          });
          this.ws.send(superjson.stringify({ type: "shutdown" }));
        }),
      ]);
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.terminate();
        this.logger.info("WorkerConnection terminated forcefully");
        return;
      }
    }
    return this.disconnectResolvers.promise;
  }

  ping() {
    this.ws.ping();
  }

  connected() {
    if (this.ws.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    return raceTimeout(
      20_000,
      "Worker connection failed to connect within 20 seconds",
      new Promise<void>((resolve, reject) => {
        this.ws.once("open", () => resolve());
        this.ws.once("error", reject);
      }),
    );
  }

  // Connections are expected to close gracefully, but if they don't, we
  // wait 30 seconds for them to close and then we move forward anyway.
  // We expect callers of this to attempt a forceful shutdown after this
  // resolves. They forcefully shutdown by calling `disconnect` IFF the
  // connection is not closed by the time this returns.
  async shutdownGracefully() {
    this.ws.send(superjson.stringify({ type: "shutdown" }));
    return Promise.race([
      sleep(30_000),
      new Promise<void>((resolve, reject) => {
        this.ws.once("close", () => resolve());
        this.ws.once("error", reject);
      }),
    ]);
  }
}
