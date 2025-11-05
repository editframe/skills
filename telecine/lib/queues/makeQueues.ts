import { vi } from "vitest";

import { promiseWithResolvers } from "@/util/promiseWithResolvers";
import { makeDataStore } from "./makeDataStore";
import { Queue } from "./Queue";
import {
  type Connection,
  type ConnectionConstructorArgs,
  Scheduler,
} from "./Scheduler";
import { Workflow } from "./Workflow";

export const makeQueues = async () => {
  const storage = await makeDataStore();

  const TestQueue = new Queue({
    name: "test",
    storage,
  });

  const TestQueue2 = new Queue({
    name: "test2",
    storage,
  });

  const TestWorkflow = new Workflow({
    name: "test-workflow",
    storage,
  });

  const TestWorkflow2 = new Workflow({
    name: "test-workflow2",
    storage,
    finalizerQueue: TestQueue2,
  });

  const TestScheduler = new Scheduler({
    storage,
    queues: [TestQueue, TestQueue2],
    connectionClass: MockConnection,
  });

  const TestScheduler2 = new Scheduler({
    storage,
    queues: [TestQueue, TestQueue2],
    connectionClass: MockConnection,
  });

  return {
    storage,
    TestQueue,
    TestQueue2,
    TestWorkflow,
    TestWorkflow2,
    TestScheduler,
    TestScheduler2,
  };
};

export class MockConnection implements Connection {
  id: string;
  queue: Queue<unknown>;
  connectionResolvers: ReturnType<typeof promiseWithResolvers<void>>;
  disconnectResolvers: ReturnType<typeof promiseWithResolvers<void>>;
  whenConnected: Promise<void>;
  whenDisconnected: Promise<void>;
  onHangup: () => void;
  onPong: () => void;
  constructor(args: ConnectionConstructorArgs) {
    this.id = Math.random().toString(36).substring(2, 15);
    this.connectionResolvers = promiseWithResolvers<void>();
    this.disconnectResolvers = promiseWithResolvers<void>();
    this.whenConnected = this.connectionResolvers.promise;
    this.whenDisconnected = this.disconnectResolvers.promise;
    this.queue = args.queue;
    this.onHangup = args.onHangup;
    this.onPong = args.onPong;
  }
  connect = vi.fn();
  disconnect = vi.fn(async () => {
    return this.disconnectResolvers.promise;
  });
  terminate = vi.fn();
  ping = vi.fn().mockImplementation(() => {
    setTimeout(() => {
      this.onPong();
    }, 1);
  });
}
