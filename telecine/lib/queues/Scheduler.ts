import { inspect } from "node:util";
import type ValKey from "iovalkey";
import SuperJSON from "superjson";

import { logger, makeLogger } from "@/logging";
import { CancelledError, raceTimeout } from "@/util/raceTimeout";
import type { Queue, QueueStats } from "./Queue";
import { Consumer } from "./lifecycle/Consumer";
import { processBatchedJobMessages } from "./lifecycle/batchLifecycleUpdate";

export interface SchedulerArgs {
  queues: Queue<unknown>[];
  storage: ValKey;
  id?: string;
  createdAt?: number;
  connectionClass: { new(args: ConnectionConstructorArgs): Connection };
}

export const SCHEDULER_TIMEOUT_MS = 10_000;
// We'll give new connections a generous amount of time to connect as we may
// be scaling up quickly.
export const NEW_CONNECTION_TIMEOUT_MS = 20_000;
export const SCHEDULER_INTERVAL_MS = 2_000;
export const PING_INTERVAL_MS = 5_000;
export const TICK_MS = 2000;
export const COMMIT_LIFECYCLE_INTERVAL_MS = 250;
export const CONNECTION_TIMEOUT_MS = PING_INTERVAL_MS * 2; // We terminate connections that don't make their ping response. So 2x seems reasonable here.
// Disconnecting workers need time to finish their current jobs
// But they shouldn't take on new  work while disconnecting
export const DISCONNECT_TIMEOUT_MS = 30_000;
// Every 2 seconds we check if any stalled jobs need to be requeued
export const RESTART_INTERVAL_MS = TICK_MS;

export interface Connection {
  id: string;
  queue: Queue<unknown>;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  terminate: () => Promise<void>;
  whenConnected: Promise<void>;
  whenDisconnected: Promise<void>;
  onHangup: (callback: () => void) => void;
  ping: () => void;
  onPong: (callback: () => void) => void;
}

export interface ConnectionConstructorArgs {
  queue: Queue<unknown>;
  onHangup: () => void;
  onPong: () => void;
}

const ConnectionStates = {
  undefined: "undefined",
  CONNECTING: "CONNECTING",
  CONNECTED: "CONNECTED",
  DISCONNECTING: "DISCONNECTING",
  TERMINAL: "TERMINAL",
} as const;

type ConnectionStates = keyof typeof ConnectionStates;

const ConnectionEvents = {
  INIT: "INIT",
  CONNECT_SUCCESS: "CONNECT_SUCCESS",
  TIMEOUT: "TIMEOUT",
  HANGUP: "HANGUP",
  DISCONNECT: "DISCONNECT",
  NO_PONG: "NO_PONG",
  DISCONNECT_SUCCESS: "DISCONNECT_SUCCESS",
} as const;

interface ConnectionMetadata {
  state: ConnectionStates;
  waitingForPong?: boolean;
  pingInterval?: NodeJS.Timeout;
}

type ConnectionEvents = keyof typeof ConnectionEvents;

interface SchedulerInfo {
  id: string;
  createdAt: number;
  stopped: boolean;
}

const serializeScheduler = (scheduler: Scheduler) =>
  SuperJSON.stringify({
    id: scheduler.id,
    createdAt: scheduler.createdAt,
    stopped: scheduler.stopped,
  } satisfies SchedulerInfo);

const deserializeScheduler = (data: string) =>
  SuperJSON.parse(data) as SchedulerInfo;

export class Scheduler {
  storage: ValKey;
  id: string;
  createdAt: number;
  consumerPromise: Promise<Consumer>;
  queues: Queue<unknown>[];
  connectingConnections: Map<Queue<unknown>, Map<string, Connection>> =
    new Map();
  connectedConnections: Map<Queue<unknown>, Map<string, Connection>> =
    new Map();
  disconnectingConnections: Map<Queue<unknown>, Map<string, Connection>> =
    new Map();

  connectionMetadata = new Map<Connection, ConnectionMetadata>();
  exitCallbacks = new Map<Connection, () => Promise<void>>();
  stalledCleanupTimeout?: NodeJS.Timeout;
  connectionClass: { new(args: ConnectionConstructorArgs): Connection };
  tickTimeout?: NodeJS.Timeout;
  stopped = false;

  logger: typeof logger;

  connectionMachine: Record<
    ConnectionStates,
    {
      store?: Map<Queue<unknown>, Map<string, Connection>>;
      events: Partial<Record<ConnectionEvents, ConnectionStates>>;
      enter?: (
        connection: Connection,
        metadata: ConnectionMetadata,
      ) => Promise<(() => Promise<void>) | void>;
    }
  >;

  get key() {
    return `scheduler:${this.id}`;
  }

  constructor(args: SchedulerArgs) {
    this.id ??= Math.random().toString(36).substring(2, 15);
    this.createdAt ??= Date.now();
    this.logger = makeLogger().child({
      component: "Scheduler",
      id: this.id,
    });
    this.storage = args.storage;
    this.queues = args.queues;
    this.connectionClass = args.connectionClass;

    this.consumerPromise = Consumer.create({
      storage: this.storage,
      consumerId: this.id,
      streamKey: "lifecycle:jobs",
      batchSize: 1000,
      blockTimeMs: 250,
    });

    this.connectionMachine = {
      [ConnectionStates.undefined]: {
        events: {
          INIT: ConnectionStates.CONNECTING,
        },
      },
      [ConnectionStates.CONNECTING]: {
        store: this.connectingConnections,
        events: {
          CONNECT_SUCCESS: ConnectionStates.CONNECTED,
          TIMEOUT: ConnectionStates.TERMINAL,
          HANGUP: ConnectionStates.TERMINAL,
        },
        enter: async (connection) => {
          const connectionRace = raceTimeout(
            NEW_CONNECTION_TIMEOUT_MS,
            "Connection failed to connect in time",
            connection.whenConnected,
          );

          const now = Date.now();
          try {
            await this.storage
              .multi()
              .zadd(`${this.key}:connecting`, now, connection.id)
              .zadd(
                `${this.key}:${connection.queue.name}:connecting`,
                now,
                connection.id,
              )
              .zremrangebyscore(
                `${this.key}:connecting`,
                "-inf",
                now - CONNECTION_TIMEOUT_MS,
              )
              .zremrangebyscore(
                `${this.key}:${connection.queue.name}:connecting`,
                "-inf",
                now - CONNECTION_TIMEOUT_MS,
              )
              .exec();
          } catch (error) {
            this.transition(connection, ConnectionEvents.TIMEOUT);
          }

          connection.connect();

          connectionRace
            .then(() => {
              return this.transition(
                connection,
                ConnectionEvents.CONNECT_SUCCESS,
              );
            })
            .catch((error) => {
              if (error instanceof CancelledError) {
                this.logger.debug(
                  { connectionId: connection.id },
                  "Connection race cancelled",
                );
                return;
              }
              this.logger.error(
                { error, connectionId: connection.id },
                "Connection race timed out",
              );
              this.transition(connection, ConnectionEvents.TIMEOUT);
            });

          return async () => {
            try {
              await this.storage
                .multi()
                .zrem(`${this.key}:connecting`, connection.id)
                .zrem(
                  `${this.key}:${connection.queue.name}:connecting`,
                  connection.id,
                )
                .exec();
            } catch (error) {
              this.logger.error(
                { error, connectionId: connection.id },
                "Failed to remove connecting connection from storage",
              );
            }
            try {
              connectionRace.cancel();
            } catch (error) {
              if (!(error instanceof CancelledError)) {
                this.logger.error(
                  { error, connectionId: connection.id },
                  "Error cancelling connection race",
                );
              }
            }
          };
        },
      },
      [ConnectionStates.CONNECTED]: {
        store: this.connectedConnections,
        events: {
          NO_PONG: ConnectionStates.DISCONNECTING,
          DISCONNECT: ConnectionStates.DISCONNECTING,
          HANGUP: ConnectionStates.TERMINAL,
        },
        enter: async (connection, metadata) => {
          metadata.pingInterval = setInterval(() => {
            logger.debug(
              {
                waitingForPong: metadata.waitingForPong,
                connectionId: connection.id,
                queueName: connection.queue.name,
              },
              "Ping interval",
            );
            if (metadata.waitingForPong) {
              this.transition(connection, ConnectionEvents.NO_PONG);
              return;
            }
            metadata.waitingForPong = true;
            connection.ping();
          }, PING_INTERVAL_MS);

          const now = Date.now();
          await this.storage
            .multi()
            .zadd(`${this.key}:connected`, now, connection.id)
            .zadd(
              `${this.key}:${connection.queue.name}:connected`,
              now,
              connection.id,
            )
            .zremrangebyscore(
              `${this.key}:connected`,
              "-inf",
              now - CONNECTION_TIMEOUT_MS,
            )
            .zremrangebyscore(
              `${this.key}:${connection.queue.name}:connected`,
              "-inf",
              now - CONNECTION_TIMEOUT_MS,
            )
            .exec();

          return async () => {
            logger.debug(
              {
                connectionId: connection.id,
                queueName: connection.queue.name,
              },
              "Clearing ping interval",
            );
            clearInterval(metadata.pingInterval);
            metadata.pingInterval = undefined;
            metadata.waitingForPong = undefined;
            await this.storage
              .multi()
              .zrem(`${this.key}:connected`, connection.id)
              .zrem(
                `${this.key}:${connection.queue.name}:connected`,
                connection.id,
              )
              .exec();
          };
        },
      },
      [ConnectionStates.DISCONNECTING]: {
        store: this.disconnectingConnections,
        events: {
          DISCONNECT_SUCCESS: ConnectionStates.TERMINAL,
          TIMEOUT: ConnectionStates.TERMINAL,
          HANGUP: ConnectionStates.TERMINAL,
        },
        enter: async (connection) => {
          const disconnectRace = raceTimeout(
            DISCONNECT_TIMEOUT_MS,
            "Connection failed to disconnect in time",
            connection.disconnect(),
          );

          const now = Date.now();
          try {
            await this.storage
              .multi()
              .zadd(`${this.key}:disconnecting`, now, connection.id)
              .zadd(
                `${this.key}:${connection.queue.name}:disconnecting`,
                now,
                connection.id,
              )
              .zremrangebyscore(
                `${this.key}:disconnecting`,
                "-inf",
                now - CONNECTION_TIMEOUT_MS,
              )
              .zremrangebyscore(
                `${this.key}:${connection.queue.name}:disconnecting`,
                "-inf",
                now - CONNECTION_TIMEOUT_MS,
              )
              .exec();
          } catch (error) {
            if (error instanceof CancelledError) {
              return;
            }
            this.transition(connection, ConnectionEvents.TIMEOUT);
          }

          disconnectRace
            .then(() => {
              this.transition(connection, ConnectionEvents.DISCONNECT_SUCCESS);
            })
            .catch((error) => {
              if (error instanceof CancelledError) {
                return;
              }
              this.transition(connection, ConnectionEvents.TIMEOUT);
            });

          return async () => {
            try {
              await this.storage
                .multi()
                .zrem(`${this.key}:disconnecting`, connection.id)
                .zrem(
                  `${this.key}:${connection.queue.name}:disconnecting`,
                  connection.id,
                )
                .exec();
            } catch (error) {
              this.logger.error(
                { error, connectionId: connection.id },
                "Failed to remove disconnecting connection from storage",
              );
            }
            try {
              disconnectRace.cancel();
            } catch (error) {
              if (!(error instanceof CancelledError)) {
                this.logger.error(
                  { error, connectionId: connection.id },
                  "Error cancelling disconnect race",
                );
              }
            }
          };
        },
      },
      [ConnectionStates.TERMINAL]: {
        events: {},
        enter: async (connection) => {
          connection.terminate();
          this.connectionMetadata.delete(connection);
        },
      },
    };
  }

  async transition(connection: Connection, event: ConnectionEvents) {
    let metadata = this.connectionMetadata.get(connection);
    if (!metadata) {
      metadata = {
        state: "undefined",
      };
      this.connectionMetadata.set(connection, metadata);
    }
    const currentState = metadata.state;
    const possibleTransitions = this.connectionMachine[currentState].events;
    const newState = possibleTransitions[event];

    if (!newState) {
      this.logger.error(
        {
          currentState,
          event,
          connectionId: connection.id,
          queueName: connection.queue.name,
        },
        "Invalid state transition",
      );
      // I don't love just letting this pass, but we'll log the errors and see
      // if we learn more about what causes them. But throwing here crashes the server
      logger.error({
        error: inspect(
          new Error(
            `Invalid transition from ${currentState} on event ${event}`,
          ),
        ),
        currentState,
        event,
        connectionId: connection.id,
        queueName: connection.queue.name,
      });
      return;
    }

    this.logger.debug(
      {
        currentState,
        newState,
        event,
        connectionId: connection.id,
        queueName: connection.queue.name,
      },
      "Connection state transition",
    );

    const oldStateMap = this.connectionMachine[currentState].store;
    const newStateMap = this.connectionMachine[newState].store;
    if (oldStateMap && !oldStateMap.has(connection.queue)) {
      oldStateMap.set(connection.queue, new Map());
    }
    if (newStateMap && !newStateMap.has(connection.queue)) {
      newStateMap.set(connection.queue, new Map());
    }

    oldStateMap?.get(connection.queue)?.delete(connection.id);

    const exitCallback = this.exitCallbacks.get(connection);
    await exitCallback?.();
    this.exitCallbacks.delete(connection);

    newStateMap?.get(connection.queue)?.set(connection.id, connection);

    metadata.state = newState;
    // This is a bit of a hack to avoid assigning "void" type to stateExitCallback
    const newStateExitCallback = await this.connectionMachine[newState].enter?.(
      connection,
      metadata,
    );
    if (newStateExitCallback) {
      this.exitCallbacks.set(connection, newStateExitCallback);
    }
  }

  getFairShare(ownRank: number, totalRanks: number, quantity: number) {
    const fairShare = Math.floor(quantity / totalRanks);
    const remainder = quantity % totalRanks;
    return fairShare + (ownRank < remainder ? 1 : 0);
  }

  async updatePresence() {
    const now = Date.now();
    await this.storage
      .multi()
      .zadd("schedulers", now, serializeScheduler(this))
      .zremrangebyscore("schedulers", 0, now - SCHEDULER_TIMEOUT_MS)
      .exec();
  }

  async removePresence() {
    await this.storage.zrem("schedulers", serializeScheduler(this));
  }

  async getPresentSchedulers() {
    const now = Date.now();
    const cutoffTime = now - SCHEDULER_TIMEOUT_MS;
    // Only get schedulers that haven't timed out
    const result = await this.storage.zrangebyscore(
      "schedulers",
      cutoffTime,
      "+inf",
      "WITHSCORES",
    );
    const deserialized = [];
    for (let i = 0; i < result.length; i += 2) {
      const serialized = result[i];
      const score = result[i + 1];
      if (serialized && score) {
        const info = deserializeScheduler(serialized);
        deserialized.push({
          ...info,
          lastUpdate: new Date(Number(score)),
        });
      }
    }
    return deserialized.sort((a, b) => {
      // First sort by createdAt
      const timeComparison = a.createdAt - b.createdAt;
      // If timestamps are equal, use id as tiebreaker
      return timeComparison === 0 ? a.id.localeCompare(b.id) : timeComparison;
    });
  }

  async getRank() {
    const schedulerIds = (await this.getPresentSchedulers()).map(
      (info) => info.id,
    );
    const rank = schedulerIds.findIndex((id) => id === this.id);
    return { rank, total: schedulerIds.length };
  }

  private terminatePresenceLoop = false;

  async getQueuesInfo() {
    const queueNames = this.queues.map((q) => q.name);
    const queueStats = JSON.parse(
      await this.storage.mgetQueueStats(10000, ...queueNames),
    );
    return queueStats as Record<string, QueueStats>;
  }

  async getUmergedSchedulersInfo() {
    const schedulers = await this.getPresentSchedulers();
    const statsList: {
      id: string;
      createdAt: Date;
      lastUpdate: Date;
      stopped: boolean;
      stats: {
        connecting: number;
        connected: number;
        disconnecting: number;
        terminal: number;
      };
      queueStats: Record<
        string,
        {
          connecting: number;
          connected: number;
          disconnecting: number;
          terminal: number;
          scalingInfo?: {
            rawTarget: number;
            smoothedTarget: number;
            actualTarget: number;
            workingConnections: number;
            naturalQueueDepth: number;
          };
        }
      >;
    }[] = [];

    for (const scheduler of schedulers) {
      const now = Date.now();

      // Get stats first, then clean up to avoid race condition
      // Get overall stats using zcard
      const tx = this.storage.multi();
      tx.zcard(`scheduler:${scheduler.id}:connecting`);
      tx.zcard(`scheduler:${scheduler.id}:connected`);
      tx.zcard(`scheduler:${scheduler.id}:disconnecting`);
      const txResults = await tx.exec();

      const [connecting, connected, disconnecting] = (txResults ?? []).map(
        ([_, count]) => Number(count ?? 0),
      );

      // Get per-queue stats
      const queueStats: Record<
        string,
        {
          connecting: number;
          connected: number;
          disconnecting: number;
          terminal: number;
        }
      > = {};

      const queueTx = this.storage.multi();
      for (const queue of this.queues) {
        queueTx.zcard(`scheduler:${scheduler.id}:${queue.name}:connecting`);
        queueTx.zcard(`scheduler:${scheduler.id}:${queue.name}:connected`);
        queueTx.zcard(`scheduler:${scheduler.id}:${queue.name}:disconnecting`);
        queueTx.get(`scheduler:${scheduler.id}:${queue.name}:scaling`);
      }
      const queueResults = await queueTx.exec();

      // Now clean up old entries after we've read the data
      const cleanupTx = this.storage.multi();
      cleanupTx.zremrangebyscore(
        `scheduler:${scheduler.id}:connecting`,
        "-inf",
        now - CONNECTION_TIMEOUT_MS,
      );
      cleanupTx.zremrangebyscore(
        `scheduler:${scheduler.id}:connected`,
        "-inf",
        now - CONNECTION_TIMEOUT_MS,
      );
      cleanupTx.zremrangebyscore(
        `scheduler:${scheduler.id}:disconnecting`,
        "-inf",
        now - CONNECTION_TIMEOUT_MS,
      );
      await cleanupTx.exec();

      for (let i = 0; i < this.queues.length; i++) {
        const queue = this.queues[i]!;
        const scalingDataRaw = queueResults?.[i * 4 + 3]?.[1];
        let scalingInfo = undefined;

        if (scalingDataRaw && typeof scalingDataRaw === 'string') {
          try {
            scalingInfo = JSON.parse(scalingDataRaw);
          } catch (e) {
            // Ignore parse errors
          }
        }

        queueStats[queue.name] = {
          connecting: Number(queueResults?.[i * 4]?.[1] ?? 0),
          connected: Number(queueResults?.[i * 4 + 1]?.[1] ?? 0),
          disconnecting: Number(queueResults?.[i * 4 + 2]?.[1] ?? 0),
          terminal: 0,
          scalingInfo,
        };
      }

      statsList.push({
        id: scheduler.id,
        createdAt: new Date(scheduler.createdAt),
        lastUpdate: scheduler.lastUpdate,
        stopped: scheduler.stopped,
        stats: {
          connecting: connecting ?? 0,
          connected: connected ?? 0,
          disconnecting: disconnecting ?? 0,
          terminal: 0,
        },
        queueStats,
      });
    }
    return statsList;
  }

  async startPresenceLoop() {
    while (true) {
      if (this.terminatePresenceLoop) {
        break;
      }
      await this.updatePresence();
      await new Promise((resolve) =>
        setTimeout(resolve, SCHEDULER_INTERVAL_MS),
      );
    }
  }

  async stopPresenceLoop() {
    this.terminatePresenceLoop = true;
  }

  start() {
    this.scheduleStalledCleanup();
    this.scheduleReconciliation();
    this.scheduleCommitLifecycle();
    this.startPresenceLoop();
  }

  scheduleReconciliation() {
    if (this.stopped) {
      return;
    }
    this.tickTimeout = setTimeout(async () => {
      this.reconcile().catch((error) => {
        logger.error({ error }, "Error reconciling");
      });
    }, TICK_MS);
  }

  scheduleStalledCleanup() {
    if (this.stopped) {
      return;
    }
    this.stalledCleanupTimeout = setTimeout(async () => {
      this.cleanupStalledJobs().catch((error) => {
        logger.error({ error }, "Error cleaning up stalled jobs");
      });
    }, RESTART_INTERVAL_MS);
  }

  async cleanupStalledJobs() {
    for (const queue of this.queues) {
      await queue.releaseAllStalledJobs();
    }
    this.scheduleStalledCleanup();
  }

  private commitLifecycleTimeout?: NodeJS.Timeout;

  scheduleCommitLifecycle() {
    if (this.stopped) {
      return;
    }
    this.commitLifecycleTimeout = setTimeout(async () => {
      this.commitLifecycle()
        .catch((error) => {
          logger.error({ error }, "Error committing lifecycle");
        })
        .finally(() => {
          this.scheduleCommitLifecycle();
        });
    }, COMMIT_LIFECYCLE_INTERVAL_MS);
  }

  /**
   * Iterate through all connections across all connection states
   * @param callback Function to call for each connection
   */
  eachConnection(callback: (connection: Connection) => void) {
    const connectionMaps = [
      this.connectingConnections,
      this.connectedConnections,
      this.disconnectingConnections,
    ];

    for (const connectionMap of connectionMaps) {
      for (const queueMap of connectionMap.values()) {
        for (const connection of queueMap.values()) {
          callback(connection);
        }
      }
    }
  }

  /**
   * Iterate through connections for a specific queue
   * @param queue The queue to iterate connections for
   * @param callback Function to call for each connection
   */
  eachQueueConnection(
    queue: Queue<unknown>,
    callback: (connection: Connection) => void,
  ) {
    const connectionMaps = [
      this.connectingConnections,
      this.connectedConnections,
      this.disconnectingConnections,
    ];

    for (const connectionMap of connectionMaps) {
      const queueMap = connectionMap.get(queue);
      if (queueMap) {
        for (const connection of queueMap.values()) {
          callback(connection);
        }
      }
    }
  }

  eachWorkingConnection(
    queue: Queue<unknown>,
    callback: (connection: Connection) => void,
  ) {
    const connectionMaps = [
      this.connectingConnections,
      this.connectedConnections,
    ];

    for (const connectionMap of connectionMaps) {
      const queueMap = connectionMap.get(queue);
      if (queueMap) {
        for (const connection of queueMap.values()) {
          callback(connection);
        }
      }
    }
  }

  /**
   * Count connections for a specific queue
   * @param queue The queue to count connections for
   * @returns The number of connections for the queue
   */
  countQueueConnections(queue: Queue<unknown>): number {
    let count = 0;
    this.eachQueueConnection(queue, () => count++);
    return count;
  }

  countWorkingConnections(queue: Queue<unknown>): number {
    let count = 0;
    this.eachWorkingConnection(queue, () => count++);
    return count;
  }

  async reconcile() {
    if (this.stopped) {
      return;
    }

    const { rank, total } = await this.getRank();
    if (rank === -1) {
      this.logger.error(
        { rank, total },
        "Scheduler not found in list of present schedulers",
      );
      this.scheduleReconciliation();
      return;
    }
    const queuesInfo = await this.getQueuesInfo();
    const queues = Object.keys(queuesInfo);

    // Process queues with jobs using fair share approach
    for (const queueName of queues) {
      const queueInfo = queuesInfo[queueName];
      const queue = this.queues.find((q) => q.name === queueName);

      if (!queue) {
        this.logger.error(
          { queueName },
          "Queue not found during reconciliation",
        );
        continue;
      }
      if (!queueInfo) {
        this.logger.error(
          { queueName },
          "Queue info not found during reconciliation",
        );
        continue;
      }

      // The natural queue depth is the sum of queued and claimed jobs
      // minus the number of stalled jobs. This number is used to scale
      // the worker fleet up and down, so it's crucial it settles to zero when
      // there is no work to be done.

      /** The natural queue depth of this queue. `queued + claimed - stalled` */
      const naturalQueueDepth =
        queueInfo.queued + queueInfo.claimed - queueInfo.stalled;

      /** The concurrent queue depth of this queue. `ceil(naturalQueueDepth / (workerConcurrency ?? 1))` */
      const concurrentQueueDepth = Math.ceil(
        naturalQueueDepth / (queue.workerConcurrency ?? 1),
      );

      /** The constrained queue depth of this queue. `min(maxWorkerCount, concurrentQueueDepth)` */
      const constrainedQueueDepth = Math.min(
        queue.maxWorkerCount ?? concurrentQueueDepth,
        concurrentQueueDepth,
      );

      // Calculate fair share of connections for this queue based on the constrained queue depth
      // Each scheduler gets assigned a portion of the total required workers
      const fairShare = this.getFairShare(rank, total, constrainedQueueDepth);

      /** Count of all connections for this queue. `connecting + connected + disconnecting` */
      const currentConnections = this.countQueueConnections(queue);

      /** Count of working connections for this queue `connected + connecting` */
      const workingConnections = this.countWorkingConnections(queue);

      if (workingConnections < fairShare) {
        this.logger.info(
          {
            queueName,
            needed: fairShare - workingConnections,
            workingConnections,
            fairShare,
          },
          "Adding connections to queue",
        );

        // Calculate how many new connections we need to create
        let needed = fairShare - workingConnections;

        // Ensure we don't exceed maxWorkerCount with our new connections
        if (needed + workingConnections > queue.maxWorkerCount) {
          needed = queue.maxWorkerCount - workingConnections;
        }

        // Create the needed connections
        // We only consider working connections when scaling up, ignoring disconnecting ones
        // This ensures the system continues processing at the desired capacity
        // while disconnecting workers gracefully finish their jobs
        for (let i = 0; i < needed; i++) {
          await this.makeConnection(queue);
        }
      } else if (currentConnections > fairShare) {
        this.logger.info(
          {
            queueName,
            toDisconnect: currentConnections - fairShare,
            currentConnections,
            fairShare,
          },
          "Removing connections from queue",
        );

        // Calculate how many connections to remove
        // Unlike scaling up, scaling down considers ALL connections (including disconnecting ones)
        // This prevents creating an excessive number of disconnect requests when the system is already
        // in the process of scaling down
        const toDisconnect = currentConnections - fairShare;

        // Only disconnect workers that are currently in the CONNECTED state
        // Workers in DISCONNECTING state are already in the process of shutting down
        const connectionsMap = this.connectedConnections.get(queue);

        if (connectionsMap && connectionsMap.size > 0) {
          const connections = Array.from(connectionsMap.values());
          for (let i = 0; i < Math.min(toDisconnect, connections.length); i++) {
            await this.transition(connections[i]!, ConnectionEvents.DISCONNECT);
          }
        }
      }
    }

    this.scheduleReconciliation();
  }

  async makeConnection(queue: Queue<unknown>) {
    const connection = new this.connectionClass({
      queue,
      onHangup: () => {
        this.transition(connection, ConnectionEvents.HANGUP);
      },
      onPong: async () => {
        const metadata = this.connectionMetadata.get(connection);
        if (!metadata) {
          throw new Error("Metadata not found for connection");
        }
        metadata.waitingForPong = false;

        // Only update timestamp if the connection still exists in the set
        if (metadata.state === ConnectionStates.CONNECTED) {
          const now = Date.now();
          try {
            await this.storage
              .multi()
              .zadd(`${this.key}:connected`, "XX", now, connection.id)
              .zadd(
                `${this.key}:${connection.queue.name}:connected`,
                "XX",
                now,
                connection.id,
              )
              .exec();
          } catch (error) {
            this.logger.error(
              { error, connectionId: connection.id },
              "Failed to update connection timestamp",
            );
          }
        }
      },
    });

    await this.transition(connection, ConnectionEvents.INIT);
  }

  whenAllDisconnectionsSettle() {
    const promises: Promise<void>[] = [];
    for (const queue of this.queues) {
      const queueConnections = this.disconnectingConnections.get(queue);
      if (queueConnections) {
        for (const connection of queueConnections.values()) {
          promises.push(connection.whenDisconnected);
        }
      }
    }
    return Promise.allSettled(promises);
  }

  stop() {
    this.logger.info({ id: this.id }, "Stopping scheduler");
    this.stopped = true;
    if (this.tickTimeout) {
      clearTimeout(this.tickTimeout);
    }
    if (this.commitLifecycleTimeout) {
      clearTimeout(this.commitLifecycleTimeout);
    }
    if (this.stalledCleanupTimeout) {
      clearTimeout(this.stalledCleanupTimeout);
    }

    const promises: Promise<void>[] = [];

    // Use eachConnection to handle all connections
    this.eachConnection((connection) => {
      const metadata = this.connectionMetadata.get(connection);
      if (!metadata) return;

      const event =
        metadata.state === ConnectionStates.CONNECTED
          ? ConnectionEvents.DISCONNECT
          : ConnectionEvents.HANGUP;

      promises.push(this.transition(connection, event));
    });

    // Also stop the presence loop
    this.stopPresenceLoop();

    this.whenAllDisconnectionsSettle().then(() => {
      this.removePresence();
    });

    return Promise.all(promises);
  }

  async commitLifecycle() {
    try {
      const consumer = await this.consumerPromise;
      await consumer.processMessages(async (messages) => {
        await processBatchedJobMessages(
          this.queues,
          messages.map((m) => m.data),
        );
      });
    } catch (error) {
      logger.error({ error }, "Error committing lifecycle");
    }
  }
}
