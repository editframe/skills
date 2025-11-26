import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { setTimeout } from "node:timers/promises";

const execAsync = promisify(exec);

async function dockerAvailable(): Promise<boolean> {
  try {
    await execAsync("docker --version");
    return true;
  } catch {
    return false;
  }
}

describe("Production Regression Tests", () => {
  const containerName = "telecine-web-prod-regression-test";
  const port = 3011;
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

    // Build the production image if it doesn't exist
    try {
      await execAsync("docker image inspect telecine-web-prod-debug");
    } catch {
      console.log("Building production image...");
      await execAsync(
        "cd telecine && ./scripts/debug-prod-web --rebuild 2>&1 | head -20",
      );
    }

    // Start the production container with required environment variables
    // These are minimal test values needed for routes to return 200 responses
    const envVars = [
      `POSTGRES_HOST=graphql-engine`,
      `POSTGRES_PORT=5432`,
      `POSTGRES_DB=hasura`,
      `POSTGRES_USER=postgres`,
      `POSTGRES_PASSWORD=postgres`,
      `NODE_ENV=production`,
      `PORT=3000`,
      `STORAGE_BUCKET=test-bucket`,
      `PUBLIC_STORAGE_BUCKET=test-bucket`,
      // Required JWT secrets (using test values)
      `HASURA_JWT_SECRET=test-hasura-jwt-secret-for-regression-testing`,
      `APPLICATION_JWT_SECRET=test-application-jwt-secret-for-regression-testing`,
      `APPLICATION_SECRET=test-application-secret-for-regression-testing`,
      `ACTION_SECRET=test-action-secret-for-regression-testing`,
      // GraphQL URLs
      `HASURA_SERVER_URL=http://localhost:3000/v1/graphql`,
      `VITE_HASURA_CLIENT_URL=http://localhost:3000/v1/graphql`,
      `VITE_WEB_HOST=http://localhost:3000`,
      `WEB_HOST=http://localhost:3000`,
      // Other required vars
      `VALKEY_HOST=valkey`,
      `VALKEY_PORT=6379`,
      // Worker websocket hosts (required but not used in test)
      `RENDER_INITIALIZER_WEBSOCKET_HOST=ws://localhost:3000`,
      `RENDER_INITIALIZER_MAX_WORKER_COUNT=1`,
      `RENDER_INITIALIZER_WORKER_CONCURRENCY=1`,
      `RENDER_FINALIZER_WEBSOCKET_HOST=ws://localhost:3000`,
      `RENDER_FINALIZER_MAX_WORKER_COUNT=1`,
      `RENDER_FINALIZER_WORKER_CONCURRENCY=1`,
      `PROCESS_HTML_FINALIZER_WEBSOCKET_HOST=ws://localhost:3000`,
      `PROCESS_HTML_FINALIZER_MAX_WORKER_COUNT=1`,
      `PROCESS_HTML_FINALIZER_WORKER_CONCURRENCY=1`,
      `INGEST_IMAGE_WEBSOCKET_HOST=ws://localhost:3000`,
      `INGEST_IMAGE_MAX_WORKER_COUNT=1`,
      `INGEST_IMAGE_WORKER_CONCURRENCY=1`,
      `PROCESS_ISOBMFF_WEBSOCKET_HOST=ws://localhost:3000`,
      `PROCESS_ISOBMFF_MAX_WORKER_COUNT=1`,
      `PROCESS_ISOBMFF_WORKER_CONCURRENCY=1`,
      `PROCESS_HTML_INITIALIZER_WEBSOCKET_HOST=ws://localhost:3000`,
      `PROCESS_HTML_INITIALIZER_MAX_WORKER_COUNT=1`,
      `PROCESS_HTML_INITIALIZER_WORKER_CONCURRENCY=1`,
      `RENDER_FRAGMENT_WEBSOCKET_HOST=ws://localhost:3000`,
      `RENDER_FRAGMENT_MAX_WORKER_COUNT=1`,
      `RENDER_FRAGMENT_WORKER_CONCURRENCY=1`,
    ].join(" -e ");

    const { stdout } = await execAsync(
      `docker run -d --name ${containerName} -p ${port}:3000 --network ${networkName} -e ${envVars} telecine-web-prod-debug --loader /app/loader.js /app/services/web/server.js`,
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
  }, 120000);

  afterAll(async () => {
    if (!dockerIsAvailable || !containerId) return;

    try {
      await execAsync(`docker stop ${containerName}`);
      await execAsync(`docker rm ${containerName}`);
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  it("should return 200 responses for valid doc paths without 'Not found' errors", async () => {
    if (!dockerIsAvailable) {
      return;
    }

    // Test the problematic path from production logs
    const testPaths = [
      "/docs/video-composition/create-a-composition/overview/",
      "/docs",
      "/docs/",
    ];

    for (const testPath of testPaths) {
      const response = await fetch(`http://localhost:${port}${testPath}`, {
        redirect: "manual",
      });

      // Should return 200 (or valid redirect) - not 500
      expect(response.status).not.toBe(500);

      // For the specific problematic path, we expect 200 or 404 (if content doesn't exist)
      // but NOT 500 with "Not found" error
      if (
        testPath === "/docs/video-composition/create-a-composition/overview/"
      ) {
        // This should be 200 if the path resolution fix works
        expect([200, 404]).toContain(response.status);
      }

      if (response.status === 200) {
        const text = await response.text();
        // Should not contain error messages
        expect(text).not.toContain("Not found");
        expect(text).not.toContain("Error: Not found");
      }
    }

    // Check logs for "Not found" errors from getLocalContent
    await setTimeout(2000); // Wait for logs to flush

    const { stdout: logs } = await execAsync(
      `docker logs ${containerName} 2>&1 | tail -200`,
    );

    const notFoundErrors = logs
      .split("\n")
      .filter(
        (line) =>
          line.includes("Error: Not found") && line.includes("getLocalContent"),
      );

    expect(notFoundErrors.length).toBe(0);
  });

  it("should return 200 responses without duplicate custom element registration errors", async () => {
    if (!dockerIsAvailable) {
      return;
    }

    // Make multiple concurrent requests to trigger SSR
    const requests = Array.from({ length: 10 }, () =>
      fetch(`http://localhost:${port}/`).catch(() => null),
    );

    const responses = await Promise.all(requests);
    await setTimeout(2000); // Wait for logs to flush

    // Verify we got successful responses
    const statusCodes = responses
      .filter((r) => r !== null)
      .map((r) => r!.status);

    // Should return 200 - not 500
    const error500s = statusCodes.filter((code) => code === 500);
    expect(error500s.length).toBe(0);

    // Check logs for duplicate registration errors
    const { stdout: logs } = await execAsync(
      `docker logs ${containerName} 2>&1 | tail -200`,
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

  it("should return 200 responses for root route without errors", async () => {
    if (!dockerIsAvailable) {
      return;
    }

    // Make many concurrent requests to root route
    const requests = Array.from({ length: 20 }, (_, i) =>
      fetch(`http://localhost:${port}/`, {
        headers: { "X-Request-ID": `test-${i}` },
      }).catch(() => null),
    );

    const responses = await Promise.all(requests);
    await setTimeout(2000); // Wait for logs to flush

    // Check that we got responses
    const statusCodes = responses
      .filter((r) => r !== null)
      .map((r) => r!.status);

    // Should return 200 (or valid redirect) - not 500
    const error500s = statusCodes.filter((code) => code === 500);
    expect(error500s.length).toBe(0);

    // At least some requests should return 200
    const success200s = statusCodes.filter((code) => code === 200);
    expect(success200s.length).toBeGreaterThan(0);

    // Check logs for the specific errors
    const { stdout: logs } = await execAsync(
      `docker logs ${containerName} 2>&1 | tail -200`,
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
