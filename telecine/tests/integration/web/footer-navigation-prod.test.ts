import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { chromium, type Browser, type Page } from "playwright";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { setTimeout as sleep } from "node:timers/promises";

const execAsync = promisify(exec);

// Production bundle test: verify footer links navigate correctly.
// This bug only manifests in the production bundle where Rollup can duplicate
// @editframe/elements into multiple chunks. When animejs.tsx's chunk and
// @editframe/react's chunk each contain their own copy, navigating from / to
// /with/animejs causes a CustomElementRegistry double-registration error,
// React Router catches it and calls window.location.reload() (still at /),
// so the URL never changes and the page scrolls to top.

const PROD_PORT = 3017;
const PROD_URL = `http://localhost:${PROD_PORT}`;
const CONTAINER_NAME = "telecine-web-prod-footer-nav-test";

async function buildProdImageIfNeeded(): Promise<void> {
  try {
    await execAsync("docker image inspect telecine-web-prod-debug");
  } catch {
    // Resolve telecine root from this file's location: tests/integration/web/ -> ../../..
    const telecineRoot = new URL("../../..", import.meta.url).pathname;
    console.log(`Building production debug image from ${telecineRoot} (this takes ~2 minutes)...`);
    await execAsync(
      `docker build -f Dockerfile.web.prod.debug -t telecine-web-prod-debug --progress=plain .`,
      { cwd: telecineRoot, timeout: 300_000 },
    );
  }
}

async function findDockerNetwork(): Promise<string> {
  try {
    const { stdout } = await execAsync("docker network ls --format '{{.Name}}'");
    const match = stdout.split("\n").find((n: string) => n.match(/^telecine.*default$/));
    return match || "telecine_default";
  } catch {
    return "telecine_default";
  }
}

async function waitForServer(url: string, maxRetries = 30): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(`${url}/`);
      if (res.status < 500) return;
    } catch {
      // not ready yet
    }
    await sleep(1000);
  }
  throw new Error(`Server at ${url} did not become ready after ${maxRetries}s`);
}

describe("Footer navigation in production bundle", () => {
  let browser: Browser;
  let containerId: string | null = null;

  beforeAll(async () => {
    await buildProdImageIfNeeded();

    const network = await findDockerNetwork();

    // Stop any leftover container from a previous run
    await execAsync(`docker rm -f ${CONTAINER_NAME}`).catch(() => {});

    const envVars = [
      "NODE_ENV=production",
      `PORT=3000`,
      "POSTGRES_HOST=editframe-postgres",
      "POSTGRES_PORT=5432",
      `POSTGRES_DB=telecine-main`,
      "POSTGRES_USER=postgres",
      "POSTGRES_PASSWORD=postgrespassword",
      "STORAGE_BUCKET=test-bucket",
      "PUBLIC_STORAGE_BUCKET=test-bucket",
      "HASURA_JWT_SECRET=test-jwt-secret-for-footer-nav-regression",
      "APPLICATION_JWT_SECRET=test-app-jwt-secret-for-footer-nav-regression",
      "APPLICATION_SECRET=test-app-secret-for-footer-nav-regression",
      "ACTION_SECRET=test-action-secret-for-footer-nav-regression",
      `HASURA_SERVER_URL=http://localhost:3000/v1/graphql`,
      `VITE_HASURA_CLIENT_URL=http://localhost:3000/v1/graphql`,
      `VITE_WEB_HOST=http://localhost:${PROD_PORT}`,
      `WEB_HOST=http://localhost:${PROD_PORT}`,
      "VALKEY_HOST=valkey",
      "VALKEY_PORT=6379",
      "RENDER_INITIALIZER_MAX_WORKER_COUNT=0",
      "RENDER_INITIALIZER_WORKER_CONCURRENCY=1",
      "RENDER_FINALIZER_MAX_WORKER_COUNT=0",
      "RENDER_FINALIZER_WORKER_CONCURRENCY=1",
      "PROCESS_HTML_FINALIZER_MAX_WORKER_COUNT=0",
      "PROCESS_HTML_FINALIZER_WORKER_CONCURRENCY=1",
      "INGEST_IMAGE_MAX_WORKER_COUNT=0",
      "INGEST_IMAGE_WORKER_CONCURRENCY=1",
      "PROCESS_ISOBMFF_MAX_WORKER_COUNT=0",
      "PROCESS_ISOBMFF_WORKER_CONCURRENCY=1",
      "PROCESS_HTML_INITIALIZER_MAX_WORKER_COUNT=0",
      "PROCESS_HTML_INITIALIZER_WORKER_CONCURRENCY=1",
      "RENDER_FRAGMENT_MAX_WORKER_COUNT=0",
      "RENDER_FRAGMENT_WORKER_CONCURRENCY=1",
    ]
      .map((e) => `-e ${e}`)
      .join(" ");

    const { stdout } = await execAsync(
      `docker run -d --name ${CONTAINER_NAME} -p ${PROD_PORT}:3000 --network ${network} ${envVars} telecine-web-prod-debug --loader /app/loader.js /app/services/web/server.js`,
    );
    containerId = stdout.trim();

    await waitForServer(PROD_URL);

    browser = await chromium.launch({ headless: true });
  }, 180_000);

  afterAll(async () => {
    await browser?.close();
    if (containerId) {
      await execAsync(`docker stop ${CONTAINER_NAME}`).catch(() => {});
      await execAsync(`docker rm ${CONTAINER_NAME}`).catch(() => {});
    }
  });

  // Helper: load homepage, trigger hero demo (which loads @editframe/react,
  // registering all custom elements), then click a footer link and verify
  // the URL changes. This is the exact reproduction path for the bug.
  async function testFooterNavAfterHeroDemoLoad(
    page: Page,
    linkHref: string,
  ): Promise<void> {
    await page.goto("/", { waitUntil: "networkidle" });

    // Click the hero play button to load @editframe/react into the browser,
    // registering all custom elements via Lit's @customElement decorator.
    // Without this step the bug does not trigger (elements not yet loaded).
    const playBtn = await page.$('button[aria-label="Play Editframe demo"]');
    if (playBtn) {
      await playBtn.click();
      // Allow time for the lazy HeroDemo chunk to load and evaluate.
      await page.waitForTimeout(2000);
    }

    // Wait for the footer to render (lazy + idle-callback gated).
    await page.waitForSelector(`footer a[href="${linkHref}"]`, {
      state: "visible",
      timeout: 20_000,
    });

    await page.click(`footer a[href="${linkHref}"]`);
    await page.waitForURL(`**${linkHref}`, { timeout: 15_000 });
    expect(page.url()).toContain(linkHref);
  }

  it("clicking Anime.js footer link from homepage navigates to /with/animejs", async () => {
    const context = await browser.newContext({
      baseURL: PROD_URL,
      viewport: { width: 1280, height: 900 },
    });
    const page = await context.newPage();
    try {
      await testFooterNavAfterHeroDemoLoad(page, "/with/animejs");
    } finally {
      await context.close();
    }
  }, 60_000);

  it("clicking SVG SMIL footer link from homepage navigates to /with/svg", async () => {
    const context = await browser.newContext({
      baseURL: PROD_URL,
      viewport: { width: 1280, height: 900 },
    });
    const page = await context.newPage();
    try {
      await testFooterNavAfterHeroDemoLoad(page, "/with/svg");
    } finally {
      await context.close();
    }
  }, 60_000);
});
