import { describe, test, expect } from "vitest";

const SCHEDULER_URL = process.env.SCHEDULER_GO_URL || "http://scheduler-go:3000";

describe("scheduler-go /api/status endpoint", () => {
  test("should return status with correct structure", async () => {
    const response = await fetch(`${SCHEDULER_URL}/api/status`);
    expect(response.ok).toBe(true);

    const status = await response.json();

    expect(status).toHaveProperty("memory");
    expect(status.memory).toHaveProperty("heapAlloc");
    expect(status.memory).toHaveProperty("heapInUse");
    expect(status.memory).toHaveProperty("heapSys");
    expect(status.memory).toHaveProperty("totalAlloc");
    expect(status.memory).toHaveProperty("numGC");
    expect(status.memory).toHaveProperty("lastGC");

    expect(typeof status.memory.heapAlloc).toBe("number");
    expect(typeof status.memory.heapInUse).toBe("number");
    expect(typeof status.memory.numGC).toBe("number");
    expect(status.memory.heapAlloc).toBeGreaterThan(0);

    expect(status).toHaveProperty("goroutines");
    expect(typeof status.goroutines).toBe("number");
    expect(status.goroutines).toBeGreaterThan(0);

    expect(status).toHaveProperty("connections");
    expect(Array.isArray(status.connections)).toBe(true);

    expect(status).toHaveProperty("scaling");
    expect(Array.isArray(status.scaling)).toBe(true);
  });

  test("should include test-fast queues in connections", async () => {
    const response = await fetch(`${SCHEDULER_URL}/api/status`);
    const status = await response.json();

    const queueNames = status.connections.map((c: any) => c.queueName);

    expect(queueNames).toContain("test-fast-initializer");
    expect(queueNames).toContain("test-fast-main");
    expect(queueNames).toContain("test-fast-finalizer");

    for (const conn of status.connections) {
      expect(conn).toHaveProperty("queueName");
      expect(conn).toHaveProperty("totalConnections");
      expect(conn).toHaveProperty("workingConnections");
      expect(typeof conn.totalConnections).toBe("number");
      expect(typeof conn.workingConnections).toBe("number");
      expect(conn.totalConnections).toBeGreaterThanOrEqual(conn.workingConnections);
    }
  });

  test("should return scaling info for active queues", async () => {
    const response = await fetch(`${SCHEDULER_URL}/api/status`);
    const status = await response.json();

    for (const scaling of status.scaling) {
      expect(scaling).toHaveProperty("queueName");
      expect(scaling).toHaveProperty("rawTarget");
      expect(scaling).toHaveProperty("smoothedTarget");
      expect(scaling).toHaveProperty("actualTarget");
      expect(scaling).toHaveProperty("workingConnections");
      expect(scaling).toHaveProperty("naturalQueueDepth");

      expect(typeof scaling.rawTarget).toBe("number");
      expect(typeof scaling.smoothedTarget).toBe("number");
      expect(typeof scaling.actualTarget).toBe("number");
      expect(typeof scaling.workingConnections).toBe("number");
      expect(typeof scaling.naturalQueueDepth).toBe("number");
    }
  });
});

