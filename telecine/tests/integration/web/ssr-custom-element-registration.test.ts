import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { setTimeout } from "node:timers/promises";

const execAsync = promisify(exec);

// Check if docker is available
async function dockerAvailable(): Promise<boolean> {
  try {
    await execAsync("docker --version");
    return true;
  } catch {
    return false;
  }
}

describe("SSR Custom Element Registration", () => {
  const containerName = "telecine-web-prod-test-regression";
  const port = 3010;
  let containerId: string | null = null;
  let dockerIsAvailable = false;

  beforeAll(async () => {
    dockerIsAvailable = await dockerAvailable();
    if (!dockerIsAvailable) {
      console.warn("Docker not available, skipping integration test");
      return;
    }
    // Find docker network
    let networkName = "telecine_default";
    try {
      const { stdout: networks } = await execAsync(
        "docker network ls --format '{{.Name}}'",
      );
      const networkMatch = networks
        .split("\n")
        .find((n) => n.match(/^(telecine|editframe)/));
      if (networkMatch) {
        networkName = networkMatch;
      }
    } catch (e) {
      // Use default
    }

    // Start the production container
    const { stdout } = await execAsync(
      `docker run -d --name ${containerName} -p ${port}:3000 --network ${networkName} -e POSTGRES_HOST=graphql-engine -e POSTGRES_PORT=5432 -e POSTGRES_DB=hasura -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e NODE_ENV=production -e PORT=3000 -e STORAGE_BUCKET=test-bucket -e PUBLIC_STORAGE_BUCKET=test-bucket telecine-web-prod-debug --loader /app/loader.js /app/services/web/server.js`,
    );
    containerId = stdout.trim();

    // Wait for server to start
    let retries = 30;
    while (retries > 0) {
      try {
        const response = await fetch(`http://localhost:${port}/healthz`);
        if (response.ok) {
          break;
        }
      } catch (e) {
        // Server not ready yet
      }
      await setTimeout(1000);
      retries--;
    }

    if (retries === 0) {
      throw new Error("Server failed to start");
    }
  }, 60000);

  afterAll(async () => {
    if (!dockerIsAvailable || !containerId) return;

    try {
      await execAsync(`docker stop ${containerName}`);
      await execAsync(`docker rm ${containerName}`);
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  it("should not have duplicate custom element registration errors", async () => {
    if (!dockerIsAvailable) {
      return;
    }
    // Make multiple requests to trigger SSR
    const requests = Array.from({ length: 10 }, () =>
      fetch(`http://localhost:${port}/`).catch(() => null),
    );

    await Promise.all(requests);
    await setTimeout(2000); // Wait for logs to flush

    // Check logs for duplicate registration errors
    const { stdout: logs } = await execAsync(
      `docker logs ${containerName} 2>&1`,
    );

    const duplicateRegistrationErrors = logs
      .split("\n")
      .filter((line) =>
        line.includes(
          "Failed to execute 'define' on 'CustomElementRegistry': the name \"ef-configuration\" has already been used",
        ),
      );

    expect(duplicateRegistrationErrors.length).toBe(0);
  });

  it("should handle multiple concurrent requests without errors", async () => {
    if (!dockerIsAvailable) {
      return;
    }
    // Make many concurrent requests
    const requests = Array.from({ length: 20 }, (_, i) =>
      fetch(`http://localhost:${port}/`, {
        headers: { "X-Request-ID": `test-${i}` },
      }).catch(() => null),
    );

    const responses = await Promise.all(requests);
    await setTimeout(2000); // Wait for logs to flush

    // Check that we got responses (even if some are errors, they shouldn't be 500s from duplicate registration)
    const statusCodes = responses
      .filter((r) => r !== null)
      .map((r) => r!.status);

    // Check logs for the specific error
    const { stdout: logs } = await execAsync(
      `docker logs ${containerName} 2>&1 | tail -100`,
    );

    const duplicateRegistrationErrors = logs
      .split("\n")
      .filter((line) =>
        line.includes(
          "Failed to execute 'define' on 'CustomElementRegistry': the name \"ef-configuration\" has already been used",
        ),
      );

    expect(duplicateRegistrationErrors.length).toBe(0);
  });
});
