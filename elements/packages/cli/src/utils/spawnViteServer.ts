import { spawn, type ChildProcess } from "node:child_process";
import debug from "debug";

const log = debug("ef:cli::spawn-vite");

export interface SpawnedViteServer {
  url: string;
  process: ChildProcess;
  kill: () => void;
}

/**
 * Spawn a Vite dev server as a subprocess and wait for it to be ready.
 * This allows Vite to run in its own process with full config resolution,
 * while the CLI maintains control via Playwright for rendering.
 */
export async function spawnViteServer(
  directory: string,
): Promise<SpawnedViteServer> {
  return new Promise((resolve, reject) => {
    log("Spawning vite dev server in", directory);

    const viteProcess = spawn("npx", ["vite", "dev"], {
      cwd: directory,
      stdio: "pipe", // Capture output to detect when ready
      env: {
        ...process.env,
        // Disable Vite's automatic browser opening
        BROWSER: "none",
      },
    });

    let url: string | null = null;
    let stderr = "";
    let resolved = false;

    // Parse stdout to detect when Vite is ready
    viteProcess.stdout?.on("data", (data: Buffer) => {
      const output = data.toString();
      log("vite stdout:", output);

      // Look for the Local URL in Vite's output
      // Format: "  ➜  Local:   http://localhost:5173/"
      const match = output.match(/Local:\s+(https?:\/\/[^\s]+)/);
      if (match && !resolved) {
        url = match[1].trim();
        resolved = true;
        log("Vite server ready at:", url);
        resolve({
          url,
          process: viteProcess,
          kill: () => {
            log("Killing vite process");
            viteProcess.kill();
          },
        });
      }
    });

    // Capture stderr for error reporting
    viteProcess.stderr?.on("data", (data: Buffer) => {
      stderr += data.toString();
      log("vite stderr:", data.toString());
    });

    // Handle process errors
    viteProcess.on("error", (error) => {
      if (!resolved) {
        resolved = true;
        reject(
          new Error(`Failed to spawn vite: ${error.message}\n${stderr}`),
        );
      }
    });

    // Handle unexpected process exit
    viteProcess.on("exit", (code, signal) => {
      if (!resolved) {
        resolved = true;
        reject(
          new Error(
            `Vite exited unexpectedly with code ${code} and signal ${signal}\n${stderr}`,
          ),
        );
      }
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        viteProcess.kill();
        reject(
          new Error(
            `Vite server did not start within 30 seconds\nStderr: ${stderr}`,
          ),
        );
      }
    }, 30000);
  });
}
