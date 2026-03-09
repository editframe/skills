import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { execSync } from "node:child_process";
import * as path from "node:path";
import { chromium } from "playwright";

function findMonorepoRoot(): string | null {
  try {
    const gitRoot = execSync("git rev-parse --show-toplevel", {
      encoding: "utf-8",
      stdio: "pipe",
    }).trim();

    if (
      existsSync(path.join(gitRoot, "elements")) &&
      existsSync(path.join(gitRoot, "telecine"))
    ) {
      return gitRoot;
    }
  } catch {
    // Not in git repo or git command failed
  }

  let currentDir = __dirname;
  while (currentDir !== path.dirname(currentDir)) {
    if (
      existsSync(path.join(currentDir, "elements")) &&
      existsSync(path.join(currentDir, "telecine"))
    ) {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }

  return null;
}

function findTargetRoot(): string {
  const monorepoRoot = findMonorepoRoot();
  if (monorepoRoot) {
    return monorepoRoot;
  }
  return path.resolve(__dirname, "..");
}

async function main() {
  const targetRoot = findTargetRoot();
  const wsEndpointPath = path.join(targetRoot, ".wsEndpoint.json");

  // Playwright adds these flags by default, which prevent Chrome from treating
  // hidden/background tabs differently. For background rendering tests, we need
  // Chrome to behave like production: suspending renderer for hidden tabs.
  //
  // ALLOW_RENDERER_BACKGROUNDING=1 removes these protective flags so we can
  // test that Worker+OffscreenCanvas continues rendering while main-thread WebGL
  // gets suspended in hidden tabs.
  const allowRendererBackgrounding =
    process.env.ALLOW_RENDERER_BACKGROUNDING === "1";
  const ignoreDefaultArgs = allowRendererBackgrounding
    ? [
        "--disable-renderer-backgrounding",
        "--disable-backgrounding-occluded-windows",
        "--disable-background-timer-throttling",
      ]
    : [];

  if (allowRendererBackgrounding) {
    console.log(
      "⚠️  ALLOW_RENDERER_BACKGROUNDING=1: Chrome will suspend renderer for hidden tabs",
    );
    console.log("   Flags removed:", ignoreDefaultArgs.join(", "));
  }

  // Launch a Playwright browser server, not just Chrome
  // Default to headless for ef run compatibility (containers connect to this)
  const browserServer = await chromium.launchServer({
    headless: process.env.HEADLESS === "false" ? false : true,
    host: "0.0.0.0",
    channel: "chrome", // Uses system Chrome
    args: [
      "--autoplay-policy=no-user-gesture-required", // Allow AudioContext without user interaction
      "--enable-features=CanvasDrawElement", // allow drawing of HTML elements to canvas with new API (for tests)
      "--ignore-certificate-errors", // Accept self-signed TLS cert from Traefik (enables HTTP/2)
    ],
    ...(ignoreDefaultArgs.length > 0 ? { ignoreDefaultArgs } : {}),
  });

  const wsEndpoint = browserServer
    .wsEndpoint()
    .replace("0.0.0.0", "host.docker.internal");
  await writeFile(wsEndpointPath, JSON.stringify({ wsEndpoint }, null, 2));
  console.log("Playwright wsEndpoint:", wsEndpoint);
  console.log("Written to:", wsEndpointPath);

  process.on("exit", () => {
    console.log("exit");
    browserServer.close();
  });
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
