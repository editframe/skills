import { writeFile } from "node:fs/promises";
import { chromium } from "playwright";

// Launch a Playwright browser server, not just Chrome
const browserServer = await chromium.launchServer({
  headless: false,
  host: "0.0.0.0",
  channel: "chrome", // Uses system Chrome
  args: [
    "--autoplay-policy=no-user-gesture-required", // Allow AudioContext without user interaction
  ],
});

const wsEndpoint = browserServer
  .wsEndpoint()
  .replace("0.0.0.0", "host.docker.internal");
await writeFile(".wsEndpoint.json", JSON.stringify({ wsEndpoint }, null, 2));
console.log("Playwright wsEndpoint:", wsEndpoint);

process.on("exit", () => {
  console.log("exit");
  browserServer.close();
});
