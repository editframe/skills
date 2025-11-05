import { describe, test, expect, vi } from "vitest";

import type { Scheduler, Connection } from "./Scheduler";
import { fixtures } from "./fixtures";
import { awaitNextTick } from "@/util/awaitNextTick";
import type { EnqueableJob } from "./Job";
import { makeQueues, type MockConnection } from "./makeQueues";

vi.useFakeTimers();

const allConnectionsSucceed = async (scheduler: Scheduler) => {
  const queueConnections = Array.from(scheduler.connectingConnections.values());
  for (const queueConnection of queueConnections) {
    for (const connection of queueConnection.values()) {
      (connection as unknown as MockConnection).connectionResolvers.resolve();
      await awaitNextTick();
    }
  }
};

// @ts-expect-error allConnectionsFail is not currently used, but should be re-instated into the tests
const allConnectionsFail = async (scheduler: Scheduler) => {
  const queueConnections = Array.from(scheduler.connectingConnections.values());
  for (const queueConnection of queueConnections) {
    for (const connection of queueConnection.values()) {
      (connection as unknown as MockConnection).connectionResolvers.reject(
        new Error("Failed to connect"),
      );
      await awaitNextTick();
    }
  }
};

// @ts-expect-error allConnectionsCallonHangup is not currently used, but should be re-instated into the tests
const allConnectionsCallonHangup = async (scheduler: Scheduler) => {
  const queueConnections = [
    ...scheduler.connectedConnections.values(),
    ...scheduler.connectingConnections.values(),
    ...scheduler.disconnectingConnections.values(),
  ];
  for (const queueConnection of queueConnections) {
    for (const connection of queueConnection.values()) {
      (connection as unknown as MockConnection).onHangup();
      await awaitNextTick();
    }
  }
};

const allDisconnectionsResolve = async (scheduler: Scheduler) => {
  const queueConnections = Array.from(
    scheduler.disconnectingConnections.values(),
  );
  for (const queueConnection of queueConnections) {
    for (const connection of queueConnection.values()) {
      (connection as unknown as MockConnection).disconnectResolvers.resolve();
      await awaitNextTick();
    }
  }
};

// @ts-expect-error allDisconnectionsReject is not currently used, but should be re-instated into the tests
const allDisconnectionsReject = async (scheduler: Scheduler) => {
  const queueConnections = Array.from(
    scheduler.disconnectingConnections.values(),
  );
  for (const queueConnection of queueConnections) {
    for (const connection of queueConnection.values()) {
      (connection as unknown as MockConnection).disconnectResolvers.reject(
        new Error("Failed to disconnect"),
      );
      await awaitNextTick();
    }
  }
};

describe("Scheduler", async () => {
  const queues = await fixtures(makeQueues);
  test("schedulers scale up to meet demand", async () => {
    const testJobs: EnqueableJob<unknown>[] = [];
    for (let i = 0; i < 10; i++) {
      testJobs.push({
        queue: queues.TestQueue.name,
        orgId: "org1",
        workflowId: "workflow1",
        jobId: `job${i}`,
        payload: {},
      });
      testJobs.push({
        queue: queues.TestQueue2.name,
        orgId: "org1",
        workflowId: "workflow1",
        jobId: `job${i * 2}`,
        payload: {},
      });
    }
    await queues.TestWorkflow.enqueueJobs(...testJobs);
    await queues.TestScheduler.updatePresence();
    await queues.TestScheduler2.updatePresence();

    await queues.TestScheduler.reconcile();
    await queues.TestScheduler2.reconcile();

    const presentSchedulers = await queues.TestScheduler.getPresentSchedulers();

    expect(
      presentSchedulers.find((s) => s.id === queues.TestScheduler.id),
    ).toBeDefined();
    expect(
      presentSchedulers.find((s) => s.id === queues.TestScheduler2.id),
    ).toBeDefined();

    const presentSchedulers2 =
      await queues.TestScheduler2.getPresentSchedulers();

    expect(
      presentSchedulers2.find((s) => s.id === queues.TestScheduler2.id),
    ).toBeDefined();
    expect(
      presentSchedulers2.find((s) => s.id === queues.TestScheduler.id),
    ).toBeDefined();

    await queues.TestScheduler.getUmergedSchedulersInfo();
    await queues.TestScheduler2.getUmergedSchedulersInfo();

    // console.log(await queues.TestScheduler.getUmergedSchedulersInfo());
    const schedulerInfo = await queues.TestScheduler.getUmergedSchedulersInfo();

    expect(schedulerInfo[0]).toMatchObject({
      createdAt: expect.any(Date),
      id: expect.any(String),
      lastUpdate: expect.any(Date),
      queueStats: {
        test: {
          connected: 0,
          connecting: 1,
          disconnecting: 0,
          terminal: 0,
        },
        test2: {
          connected: 0,
          connecting: 1,
          disconnecting: 0,
          terminal: 0,
        },
      },
      stats: {
        connected: 0,
        connecting: 2,
        disconnecting: 0,
        terminal: 0,
      },
    });

    expect(schedulerInfo[1]).toMatchObject({
      createdAt: expect.any(Date),
      id: expect.any(String),
      lastUpdate: expect.any(Date),
      queueStats: {
        test: {
          connected: 0,
          connecting: 0,
          disconnecting: 0,
          terminal: 0,
        },
        test2: {
          connected: 0,
          connecting: 0,
          disconnecting: 0,
          terminal: 0,
        },
      },
      stats: {
        connected: 0,
        connecting: 0,
        disconnecting: 0,
        terminal: 0,
      },
    });

    await allConnectionsSucceed(queues.TestScheduler);
    await allConnectionsSucceed(queues.TestScheduler2);

    await expect(
      queues.TestScheduler.getUmergedSchedulersInfo(),
    ).resolves.toMatchObject([
      {
        createdAt: expect.any(Date),
        id: expect.any(String),
        lastUpdate: expect.any(Date),
        queueStats: {
          test: {
            connected: 1,
            connecting: 0,
            disconnecting: 0,
            terminal: 0,
          },
          test2: {
            connected: 1,
            connecting: 0,
            disconnecting: 0,
            terminal: 0,
          },
        },
        stats: {
          connected: 0,
          connecting: 0,
          disconnecting: 0,
          terminal: 0,
        },
        stopped: false,
      },
      {
        createdAt: expect.any(Date),
        id: expect.any(String),
        lastUpdate: expect.any(Date),
        queueStats: {
          test: {
            connected: 0,
            connecting: 0,
            disconnecting: 0,
            terminal: 0,
          },
          test2: {
            connected: 0,
            connecting: 0,
            disconnecting: 0,
            terminal: 0,
          },
        },
        stats: {
          connected: 0,
          connecting: 0,
          disconnecting: 0,
          terminal: 0,
        },
        stopped: false,
      },
    ]);

    await queues.TestScheduler.stop();

    await queues.TestScheduler.reconcile();
    await queues.TestScheduler2.reconcile();

    const disconnectPromise =
      queues.TestScheduler.whenAllDisconnectionsSettle();

    await allDisconnectionsResolve(queues.TestScheduler);

    await disconnectPromise;
  });
});

describe("Scheduler with multiple instances", async () => {
  const queues = await fixtures(makeQueues);

  test("when calling stop, all connections are disconnected", async () => {
    // Add jobs to both queues
    await queues.TestWorkflow.enqueueJobs(
      {
        queue: queues.TestQueue.name,
        orgId: "org1",
        workflowId: "workflow1",
        jobId: "job1",
        payload: {},
      },
      {
        queue: queues.TestQueue2.name,
        orgId: "org1",
        workflowId: "workflow1",
        jobId: "job2",
        payload: {},
      },
    );

    await queues.TestScheduler.updatePresence();
    await queues.TestScheduler.reconcile();

    // Get references to connections before they're stopped
    const connectingConnections: Connection[] = [];
    queues.TestScheduler.eachConnection((connection) => {
      connectingConnections.push(connection);
    });

    // Some connections should be connecting
    expect(connectingConnections.length).toBeGreaterThan(0);

    // Stop the scheduler
    await queues.TestScheduler.stop();

    // Verify all connections were properly handled
    for (const connection of connectingConnections) {
      expect(connection.terminate).toHaveBeenCalled();
    }
  });
});
